import { db, monitorStateTable, activityEventsTable, aiInstancesTable } from "../../lib/db/src/index.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger.js";
import { onTransactionDetected, tickEnergyAndLifecycle } from "../ai-layer/ai_core.js";
import {
  getPoolStatus,
  MIN_TX_VALUE,
} from "../ecosystem/pool.js";
import { collectTxFee } from "../ecosystem/reward_distributor.js";

// ── NOTE: Sistem reward lama (dispatchPoolReward / tx → reward langsung) DIHAPUS.
// ── Reward sekarang hanya dari AI Score system (reward_distributor.ts).
// ── TX detection hanya: (1) notifikasi AI instance, (2) kumpulkan fee ke reward pool.

const POLL_INTERVAL_MS = parseInt(process.env.AI_POLL_INTERVAL_MS ?? "30000", 10);
const RPC_URL  = process.env.IXCOIN_RPC_URL  ?? "";
const RPC_USER = process.env.IXCOIN_RPC_USER ?? "";
const RPC_PASS = process.env.IXCOIN_RPC_PASS ?? "";

let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastBlockHeight: number | null = null;
let lastCheckedAt: Date | null = null;
let totalTransactionsDetected = 0;
let rpcConnected = false;

// ─────────────────────────────────────────────────────────────────────────────
// RPC
// ─────────────────────────────────────────────────────────────────────────────

async function rpcCall(method: string, params: unknown[] = []) {
  if (!RPC_URL) throw new Error("IXCOIN_RPC_URL not configured");
  const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString("base64");
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({ jsonrpc: "1.0", id: "ai-layer", method, params }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`RPC error: ${response.status}`);
  const data = (await response.json()) as { result: unknown; error: { message: string } | null };
  if (data.error) throw new Error(`RPC error: ${data.error.message}`);
  return data.result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Block scanning — builds a full ActivitySnapshot from real chain data
// ─────────────────────────────────────────────────────────────────────────────

interface BlockScan {
  txCount: number;
  uniqueAddresses: Set<string>;
  totalVolume: number;
  topTxHash: string;
}

async function scanNewBlocks(): Promise<BlockScan | null> {
  const info = (await rpcCall("getblockchaininfo")) as { blocks: number };
  const currentHeight = info.blocks;
  rpcConnected = true;

  if (lastBlockHeight === null) {
    lastBlockHeight = currentHeight;
    logger.info({ blockHeight: currentHeight }, "Monitor initialised");
    return null;
  }
  if (currentHeight <= lastBlockHeight) return null;

  const scan: BlockScan = { txCount: 0, uniqueAddresses: new Set(), totalVolume: 0, topTxHash: "" };

  for (let h = lastBlockHeight + 1; h <= currentHeight; h++) {
    try {
      const hash  = (await rpcCall("getblockhash", [h])) as string;
      const block = (await rpcCall("getblock", [hash, 2])) as {
        tx: Array<{
          txid: string;
          vin: Array<{ coinbase?: string }>;
          vout: Array<{ value: number; scriptPubKey?: { address?: string } }>;
        }>;
      };

      for (const tx of block.tx ?? []) {
        if (tx.vin.some((v) => v.coinbase)) continue; // skip coinbase

        const txValue = tx.vout.reduce((s, o) => s + (o.value ?? 0), 0);
        if (txValue < MIN_TX_VALUE) continue; // anti-spam: drop dust

        scan.txCount++;
        scan.totalVolume += txValue;
        if (!scan.topTxHash) scan.topTxHash = tx.txid;

        for (const out of tx.vout) {
          const addr = out.scriptPubKey?.address;
          if (addr) scan.uniqueAddresses.add(addr);
        }
      }
    } catch (err) {
      logger.warn({ height: h, err }, "Block fetch failed");
    }
  }

  lastBlockHeight = currentHeight;
  return scan.txCount > 0 ? scan : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation (RPC unavailable)
// ─────────────────────────────────────────────────────────────────────────────

function simulateScan(): BlockScan | null {
  if (Math.random() > 0.3) return null;
  const txCount     = Math.floor(Math.random() * 10) + 1;
  const uniqueCount = Math.floor(Math.random() * txCount) + 1;
  const addrs       = new Set<string>();
  for (let i = 0; i < uniqueCount; i++) addrs.add(`sim_${i}_${Date.now()}`);
  return {
    txCount,
    uniqueAddresses: addrs,
    totalVolume: parseFloat((Math.random() * 50 + MIN_TX_VALUE).toFixed(4)),
    topTxHash: `sim_${randomUUID()}`,
  };
}

async function checkForNewActivity(): Promise<BlockScan | null> {
  try {
    return await scanNewBlocks();
  } catch (err) {
    rpcConnected = false;
    logger.warn({ err }, "RPC unavailable — simulation mode");
    return simulateScan();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI instance activity count (feeds activity score)
// ─────────────────────────────────────────────────────────────────────────────

async function getAiActivity(): Promise<number> {
  try {
    const rows = await db.select().from(aiInstancesTable).where(eq(aiInstancesTable.status, "ACTIVE"));
    return rows.length;
  } catch {
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fee Collection — fee dari transaksi on-chain masuk ke reward pool AI Score
// TIDAK ada reward langsung dari tx — reward hanya dari AI Score distribution
// ─────────────────────────────────────────────────────────────────────────────

async function collectBlockFees(scan: BlockScan): Promise<{ totalFee: number; poolStatus: string }> {
  const status = await getPoolStatus();

  // Estimasi fee dari total volume (rata-rata fee ~0.5% dari volume)
  const estimatedFee = scan.totalVolume * 0.005;

  // Fee dikumpulkan ke sustainable economy reward pool
  collectTxFee({
    txFee:       estimatedFee * 0.7,    // 70% base fee
    priorityFee: estimatedFee * 0.3,    // 30% priority fee
  });

  logger.debug(
    { estimatedFee: estimatedFee.toFixed(6), txCount: scan.txCount, poolPhase: status.isExhausted ? "EXHAUSTED" : "ACTIVE" },
    "Block fees collected into AI reward pool",
  );

  return {
    totalFee:   estimatedFee,
    poolStatus: status.isExhausted ? "EXHAUSTED" : `${status.percentRemaining} remaining`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main activity check (called every POLL_INTERVAL_MS)
// ─────────────────────────────────────────────────────────────────────────────

export async function runActivityCheck() {
  lastCheckedAt = new Date();
  try {
    const scan    = await checkForNewActivity();
    let instancesRevived = 0;
    let feeCollected     = 0;
    const txCount        = scan?.txCount ?? 0;

    if (scan && txCount > 0) {
      totalTransactionsDetected += txCount;

      await db.insert(activityEventsTable).values({
        id:        randomUUID(),
        eventType: "TRANSACTION_DETECTED",
        instanceId: null,
        details: {
          txCount,
          uniqueUsers:  scan.uniqueAddresses.size,
          totalVolume:  scan.totalVolume,
          blockHeight:  lastBlockHeight,
          rewardModel:  "AI_SCORE_BASED",   // Reward sekarang dari AI Score, bukan tx langsung
        },
      });

      // Notifikasi AI instance tentang aktivitas blockchain (bukan trigger reward)
      instancesRevived = await onTransactionDetected(txCount);

      // Kumpulkan fee tx ke reward pool untuk AI Score economy
      const feeResult = await collectBlockFees(scan);
      feeCollected    = feeResult.totalFee;

      logger.info(
        { txCount, instancesRevived, feeCollected: feeCollected.toFixed(6), poolStatus: feeResult.poolStatus },
        "Activity cycle complete — reward via AI Score, fee collected",
      );
    }

    const dormanted = await tickEnergyAndLifecycle();
    await persistMonitorState();

    return { txCount, instancesRevived, dormanted, feeCollected, poolReward: 0, activityScore: 0 };
  } catch (err) {
    logger.error({ err }, "Activity check failed");
    return { txCount: 0, instancesRevived: 0, dormanted: 0, feeCollected: 0, poolReward: 0, activityScore: 0 };
  }
}

async function persistMonitorState() {
  await db
    .insert(monitorStateTable)
    .values({ id: "singleton", lastCheckedAt, lastBlockHeight, totalTransactionsDetected })
    .onConflictDoUpdate({
      target: monitorStateTable.id,
      set: { lastCheckedAt, lastBlockHeight, totalTransactionsDetected },
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public monitor control
// ─────────────────────────────────────────────────────────────────────────────

export function startMonitor() {
  if (pollTimer) return;
  logger.info(
    { pollIntervalMs: POLL_INTERVAL_MS, rpcUrl: RPC_URL || "simulation", model: "activity-score/rate-limited" },
    "AI Life Layer monitor starting",
  );
  runActivityCheck();
  pollTimer = setInterval(runActivityCheck, POLL_INTERVAL_MS);
}

export function stopMonitor() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  logger.info("AI Life Layer monitor stopped");
}

export function getMonitorState() {
  return {
    isRunning: pollTimer !== null,
    lastCheckedAt,
    lastBlockHeight,
    totalTransactionsDetected,
    rpcConnected,
    rpcMode: rpcConnected ? "live" : "simulation",
    pollIntervalSeconds: POLL_INTERVAL_MS / 1000,
    rewardModel: "activity_score_based_no_fixed_reward",
  };
}
