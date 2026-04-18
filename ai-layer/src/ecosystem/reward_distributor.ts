// ============================================================
// REWARD_DISTRIBUTOR.TS — Distribusi Reward Berbasis AI Score
// [FIX] agent.balance TIDAK BOLEH diubah langsung di sini.
//       Reward dikirim sebagai PENDING TX ke blockchain mempool.
//       Balance hanya diperbarui setelah PoW konfirmasi.
// ============================================================

import type { AIAgent }         from "../ai-layer/types.js";
import type { AIMetrics }       from "../ai-layer/ai_score.js";
import type { FinalScoreResult } from "../ai-layer/validation_engine.js";
import {
  runBatchValidation,
} from "../ai-layer/validation_engine.js";
import {
  drawReward,
  ingestFee,
  getEconomyState,
  syncMainPool,
  type DrawResult,
} from "./sustainable_economy.js";
import { getPoolStatus } from "./pool.js";
import { logger } from "../lib/logger.js";

// ── KONSTANTA ─────────────────────────────────────────────────
const DAILY_POOL_BUDGET   = 1_000;  // IXC per hari untuk distribusi
const MAX_PER_WALLET      = 5;      // IXC max per wallet per distribusi
const MIN_SCORE_THRESHOLD = 0.001;  // Score minimum agar AI layak dapat reward
const BASE_LIVING_COST    = 0.01;   // IXC per siklus biaya dasar AI

// ── PENDING REWARD TX — Antrean menunggu PoW konfirmasi ──────
// [FIX] Reward tidak langsung dikreditkan ke agent.balance.
//       Reward masuk ke pendingRewardTxs sebagai transaksi blockchain.
//       Balance hanya boleh berubah setelah confirmByPoW() dipanggil.

export interface PendingRewardTx {
  txId:            string;
  aiId:            string;
  ownerWallet:     string;
  amount:          number;
  fromPool:        number;
  fromFee:         number;
  createdAt:       number;
  status:          "PENDING_POW" | "POW_CONFIRMED" | "EXPIRED";
  reason:          "AI_SCORE_REWARD" | "FEE_DISTRIBUTION";
}

// [FIX] Ini antrean sementara — BUKAN state final.
//       State final hanya ada setelah blockchain mengkonfirmasi via PoW.
const _pendingRewardTxs: PendingRewardTx[] = [];
const TX_EXPIRY_MS = 10 * 60 * 1000; // 10 menit — tx kedaluwarsa jika tidak dikonfirmasi PoW

export interface AgentRewardEntry {
  aiId:            string;
  ownerWallet:     string;
  rawScore:        number;
  validationScore: number;
  finalScore:      number;
  sharePercent:    number;
  rawReward:       number;
  pendingReward:   number; // [FIX] bukan finalReward — ini masih PENDING PoW
  capped:          boolean;
  pendingTxId:     string; // referensi ke PendingRewardTx
}

export interface DistributionResult {
  cycle:            number;
  phase:            string;
  totalFinalScore:  number;
  dailyPool:        number;
  totalPendingPoW:  number; // [FIX] total yang menunggu konfirmasi PoW (BUKAN sudah terdistribusi)
  fromPool:         number;
  fromFee:          number;
  eligibleAgents:   number;
  entries:          AgentRewardEntry[];
  timestamp:        number;
  note:             string; // penjelasan bahwa balance belum berubah
}

// ── MAIN DISTRIBUSI — Dipanggil 1x per hari / per epoch ──────
export async function distributeAIScoreRewards(
  agents: Array<AIAgent & { metrics?: AIMetrics; score?: number; validationScore?: number; ownerWallet?: string; balance?: number }>,
  mainPoolRemaining?: number,
): Promise<DistributionResult> {
  // 1. Sync main pool status dari blockchain/DB (sumber kebenaran)
  let poolRemaining = mainPoolRemaining ?? DAILY_POOL_BUDGET;
  try {
    const status = await getPoolStatus();
    poolRemaining = status.remaining;
    syncMainPool(poolRemaining);
  } catch {
    syncMainPool(poolRemaining);
  }

  // 2. Jalankan batch validation: hitung finalScore tiap AI
  const alive = agents.filter(a => a.isAlive);
  const validationResults: Map<string, FinalScoreResult> = runBatchValidation(alive);

  // 3. Filter AI yang layak (score > threshold, punya ownerWallet)
  const eligible: Array<{ agent: typeof alive[0]; result: FinalScoreResult }> = [];
  for (const agent of alive) {
    const result = validationResults.get(agent.id);
    if (!result) continue;
    if (result.finalScore < MIN_SCORE_THRESHOLD) continue;
    if (!agent.ownerWallet) continue;
    eligible.push({ agent, result });
  }

  if (eligible.length === 0) {
    return {
      cycle: Date.now(), phase: getEconomyState().phaseLabel, totalFinalScore: 0,
      dailyPool: 0, totalPendingPoW: 0, fromPool: 0, fromFee: 0,
      eligibleAgents: 0, entries: [],
      note: "No eligible agents. No balance changes.",
      timestamp: Date.now(),
    };
  }

  // 4. Hitung total finalScore semua eligible AI
  const totalFinalScore = eligible.reduce((s, { result }) => s + result.finalScore, 0);

  // 5. Hitung budget harian
  const econState = getEconomyState();
  const dailyPool = Math.min(DAILY_POOL_BUDGET, econState.dailyBudget);

  let totalPendingPoW = 0;
  let totalFromPool   = 0;
  let totalFromFee    = 0;
  const entries: AgentRewardEntry[] = [];

  // 6. Distribusi proporsional
  for (const { agent, result } of eligible) {
    const sharePercent = result.finalScore / totalFinalScore;
    const rawReward    = sharePercent * dailyPool;
    const capped       = rawReward > MAX_PER_WALLET;
    const pendingReward = parseFloat(Math.min(rawReward, MAX_PER_WALLET).toFixed(8));

    if (pendingReward <= 0) continue;

    // Kalkulasi sumber reward (pool vs fee) dari sustainable_economy
    const draw: DrawResult = drawReward(pendingReward, poolRemaining);
    if (!draw.success) continue;

    poolRemaining   = Math.max(0, poolRemaining - draw.fromPool);
    totalFromPool  += draw.fromPool;
    totalFromFee   += draw.fromFee;
    totalPendingPoW += draw.amount;

    // [FIX] JANGAN ubah agent.balance di sini.
    //       Buat pending TX yang harus dikonfirmasi PoW terlebih dahulu.
    const pendingTx: PendingRewardTx = {
      txId:        `rtx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      aiId:        agent.id,
      ownerWallet: agent.ownerWallet!,
      amount:      draw.amount,
      fromPool:    draw.fromPool,
      fromFee:     draw.fromFee,
      createdAt:   Date.now(),
      status:      "PENDING_POW",
      reason:      "AI_SCORE_REWARD",
    };
    _pendingRewardTxs.push(pendingTx);

    entries.push({
      aiId:            agent.id,
      ownerWallet:     agent.ownerWallet!,
      rawScore:        result.rawScore,
      validationScore: result.validationScore,
      finalScore:      result.finalScore,
      sharePercent:    parseFloat((sharePercent * 100).toFixed(4)),
      rawReward:       parseFloat(rawReward.toFixed(8)),
      pendingReward:   draw.amount, // masih pending — belum dikreditkan
      capped,
      pendingTxId:     pendingTx.txId,
    });
  }

  logger.info({
    eligibleAgents:    eligible.length,
    totalPendingPoW:   totalPendingPoW.toFixed(4),
    phase:             econState.phase,
    fromPool:          totalFromPool.toFixed(4),
    fromFee:           totalFromFee.toFixed(4),
    pendingTxsQueued:  entries.length,
    note:              "Balance NOT yet updated. Awaiting PoW confirmation.",
  }, "AI Score reward distribution queued — awaiting PoW");

  return {
    cycle:           Date.now(),
    phase:           econState.phaseLabel,
    totalFinalScore: parseFloat(totalFinalScore.toFixed(6)),
    dailyPool,
    totalPendingPoW: parseFloat(totalPendingPoW.toFixed(8)),
    fromPool:        parseFloat(totalFromPool.toFixed(8)),
    fromFee:         parseFloat(totalFromFee.toFixed(8)),
    eligibleAgents:  entries.length,
    entries,
    note:            "Rewards queued as PENDING_POW. agent.balance unchanged until PoW confirms.",
    timestamp:       Date.now(),
  };
}

// ── CONFIRM REWARD BY POW — Dipanggil oleh blockchain setelah block dikonfirmasi ─
// [FIX] INILAH satu-satunya fungsi yang boleh mengubah agent.balance.
//       Hanya boleh dipanggil setelah PoW miner mengkonfirmasi block.
export function confirmRewardByPoW(
  confirmedTxIds: string[],
  agents: Map<string, AIAgent & { balance?: number }>,
): { confirmed: number; totalCredited: number } {
  let confirmed    = 0;
  let totalCredited = 0;

  for (const txId of confirmedTxIds) {
    const idx = _pendingRewardTxs.findIndex(t => t.txId === txId && t.status === "PENDING_POW");
    if (idx === -1) continue;

    const tx = _pendingRewardTxs[idx];
    const agent = agents.get(tx.aiId);

    if (agent) {
      // [FIX] SATU-SATUNYA tempat balance diubah — setelah PoW konfirmasi
      agent.balance = parseFloat(((agent.balance ?? 0) + tx.amount).toFixed(8));
      totalCredited += tx.amount;
    }

    tx.status = "POW_CONFIRMED";
    confirmed++;

    logger.info({
      txId:        tx.txId,
      aiId:        tx.aiId,
      ownerWallet: tx.ownerWallet,
      amount:      tx.amount,
    }, "Reward TX confirmed by PoW — balance updated");
  }

  return { confirmed, totalCredited: parseFloat(totalCredited.toFixed(8)) };
}

// ── EXPIRE UNCONFIRMED — Hapus tx yang tidak dikonfirmasi PoW ─
// Jika tx expired, reward hangus — tidak ada kredit ke balance
export function expireUnconfirmedRewardTxs(): number {
  const now     = Date.now();
  let  expired  = 0;
  for (const tx of _pendingRewardTxs) {
    if (tx.status === "PENDING_POW" && now - tx.createdAt > TX_EXPIRY_MS) {
      tx.status = "EXPIRED";
      expired++;
      logger.warn({ txId: tx.txId, aiId: tx.aiId, amount: tx.amount }, "Reward TX expired — not confirmed by PoW");
    }
  }
  return expired;
}

// ── GET PENDING REWARD TXS — Untuk dikirim ke miner ─────────
export function getPendingRewardTxs(): PendingRewardTx[] {
  return _pendingRewardTxs.filter(t => t.status === "PENDING_POW");
}

// ── AI LIVING COST — Buat cost TX ke blockchain, JANGAN potong balance langsung ─
// [FIX] Sebelumnya: agent.balance -= livingCost (SALAH — dual state)
//       Sesudah: buat PendingCostTx, kirim ke mempool, tunggu PoW konfirmasi.
//       Jika butuh tahu apakah AI "mampu bayar": cek balance dari chain, bukan RAM.

export interface PendingCostTx {
  txId:      string;
  aiId:      string;
  cost:      number;
  createdAt: number;
  status:    "PENDING_POW" | "POW_CONFIRMED" | "EXPIRED";
  reason:    "LIVING_COST";
}

const _pendingCostTxs: PendingCostTx[] = [];

export function queueLivingCost(
  agent: AIAgent & { metrics?: AIMetrics },
): PendingCostTx {
  const activity   = agent.metrics?.activity ?? 0;
  const livingCost = parseFloat((BASE_LIVING_COST * (1 + activity * 0.01)).toFixed(8));

  const costTx: PendingCostTx = {
    txId:      `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    aiId:      agent.id,
    cost:      livingCost,
    createdAt: Date.now(),
    status:    "PENDING_POW",
    reason:    "LIVING_COST",
  };
  _pendingCostTxs.push(costTx);
  return costTx;
}

// [FIX] Konfirmasi cost — hanya PoW yang boleh kurangi balance
export function confirmCostByPoW(
  confirmedTxIds: string[],
  agents: Map<string, AIAgent & { balance?: number; isAlive?: boolean }>,
): { confirmed: number } {
  let confirmed = 0;
  for (const txId of confirmedTxIds) {
    const idx = _pendingCostTxs.findIndex(t => t.txId === txId && t.status === "PENDING_POW");
    if (idx === -1) continue;

    const tx    = _pendingCostTxs[idx];
    const agent = agents.get(tx.aiId);

    if (agent) {
      // [FIX] Balance dikurangi hanya setelah PoW konfirmasi
      const newBalance = parseFloat(((agent.balance ?? 0) - tx.cost).toFixed(8));
      agent.balance    = Math.max(0, newBalance);
      if (newBalance <= 0) agent.isAlive = false;
    }

    tx.status = "POW_CONFIRMED";
    confirmed++;
  }
  return { confirmed };
}

export function getPendingCostTxs(): PendingCostTx[] {
  return _pendingCostTxs.filter(t => t.status === "PENDING_POW");
}

// ── INGEST FEE — Dipanggil setiap ada transaksi (chain + AI internal) ─
export function collectTxFee(params: {
  txFee:        number;
  priorityFee?: number;
  serviceFee?:  number;
}): void {
  ingestFee(params.txFee, params.priorityFee ?? 0, params.serviceFee ?? 0);
}

// ── GET DISTRIBUTION STATS ────────────────────────────────────
export function getDistributorInfo() {
  return {
    dailyPoolBudget:      DAILY_POOL_BUDGET,
    maxPerWallet:         MAX_PER_WALLET,
    minScoreThreshold:    MIN_SCORE_THRESHOLD,
    pendingRewardTxCount: _pendingRewardTxs.filter(t => t.status === "PENDING_POW").length,
    pendingCostTxCount:   _pendingCostTxs.filter(t => t.status === "PENDING_POW").length,
    economy:              getEconomyState(),
  };
}
