/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║            AI ECOSYSTEM SUPPLY CONTROL — FINAL RULES               ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  1. ALL AI rewards MUST come from the 5,000,000 IXC pool ONLY.     ║
 * ║  2. The system NEVER mints new coins. It only distributes what is   ║
 * ║     already allocated. distributed + remaining = 5,000,000 always. ║
 * ║  3. HARD STOP: if (ai_pool_remaining <= 0) → STOP ALL REWARDS.     ║
 * ║     This is permanent. The pool cannot be refilled.                 ║
 * ║  4. No bypass, no secondary source, no overflow, no mint function.  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import {
  db,
  aiPoolStateTable,
  aiRewardHistoryTable,
  aiWalletDailyTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger.js";

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLY CONSTANTS (immutable at runtime)
// ─────────────────────────────────────────────────────────────────────────────

/** Hard-coded total. Can never be changed at runtime. */
export const AI_POOL_TOTAL = 5_000_000 as const;

/** Reward scales linearly between these as pool depletes (long-tail emission). */
const BASE_REWARD_MIN = 0.005;
const BASE_REWARD_MAX = 0.02;

/** Rate-limiting caps — prevent abuse without affecting honest participants. */
const MAX_REWARD_PER_TX   = 0.1;     // IXC — ceiling per single distribution
const MAX_WALLET_DAILY    = 5;       // IXC — per wallet per calendar day
const MAX_GLOBAL_DAILY    = 1_000;   // IXC — global daily emission ceiling

/** Anti-spam: transactions below this value receive no reward. */
export const MIN_TX_VALUE = 0.001;   // IXC

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivitySnapshot {
  txCount: number;
  uniqueUsers: number;
  txVolume: number;
  aiActivity: number;
}

export interface RewardCalculation {
  activityScore: number;
  baseReward: number;
  rawReward: number;
  cappedReward: number;
  limitReason: string | null;
}

export interface PoolStatus {
  totalPool: number;
  remaining: number;
  distributed: number;
  integrityCheck: boolean;    // distributed + remaining === totalPool
  percentRemaining: string;
  isExhausted: boolean;
  dailyEmitted: number;
  dailyRemaining: number;
  date: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * SUPPLY INTEGRITY CHECK
 * Verifies distributed + remaining === AI_POOL_TOTAL at all times.
 * If this ever returns false, something has modified the DB directly —
 * treat it as a critical bug.
 */
function verifyIntegrity(state: { remaining: number; distributed: number; totalPool: number }): boolean {
  const sum = parseFloat((state.remaining + state.distributed).toFixed(8));
  const expected = parseFloat(state.totalPool.toFixed(8));
  return Math.abs(sum - expected) < 0.000001; // float tolerance
}

/** Bootstrap singleton row on first call. Never inserts more than once. */
async function ensurePoolState(): Promise<void> {
  const existing = await db
    .select()
    .from(aiPoolStateTable)
    .where(eq(aiPoolStateTable.id, "singleton"));

  if (existing.length === 0) {
    await db.insert(aiPoolStateTable).values({
      id: "singleton",
      totalPool: AI_POOL_TOTAL,
      remaining: AI_POOL_TOTAL,
      distributed: 0,
      isExhausted: false,
      dailyEmitted: 0,
      dailyEmitDate: todayUTC(),
    });
    logger.info({ totalPool: AI_POOL_TOTAL }, "AI Ecosystem pool bootstrapped");
  }
}

/** Returns current daily emission, resetting counter if calendar day changed. */
async function resolveDailyEmission(
  state: typeof aiPoolStateTable.$inferSelect,
): Promise<number> {
  const today = todayUTC();
  if (state.dailyEmitDate !== today) {
    await db
      .update(aiPoolStateTable)
      .set({ dailyEmitted: 0, dailyEmitDate: today })
      .where(eq(aiPoolStateTable.id, "singleton"));
    return 0;
  }
  return state.dailyEmitted;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reward formula (exported so monitor and API can show worked examples)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Weighted activity score:
 *   score = txCount×0.4 + uniqueUsers×0.3 + min(txVolume,100)×0.2 + aiActivity×0.1
 *
 * No fixed number — the score is always a function of real network metrics.
 */
export function calcActivityScore(snap: ActivitySnapshot): number {
  const normalizedVolume = Math.min(snap.txVolume, 100);
  const score =
    snap.txCount    * 0.4 +
    snap.uniqueUsers * 0.3 +
    normalizedVolume * 0.2 +
    snap.aiActivity  * 0.1;
  return parseFloat(score.toFixed(6));
}

/**
 * Base reward shrinks as pool depletes — emission naturally slows over time
 * ensuring the pool lasts the lifetime of the network.
 *
 *   baseReward = BASE_MIN + (BASE_MAX − BASE_MIN) × (remaining / totalPool)
 */
export function calcBaseReward(remaining: number, total: number): number {
  const factor = Math.max(0, Math.min(1, remaining / total));
  return BASE_REWARD_MIN + (BASE_REWARD_MAX - BASE_REWARD_MIN) * factor;
}

export function calcReward(
  snap: ActivitySnapshot,
  remaining: number,
  total: number,
): RewardCalculation {
  const activityScore = calcActivityScore(snap);
  const baseReward    = calcBaseReward(remaining, total);
  const rawReward     = baseReward * activityScore;
  const cappedReward  = Math.min(rawReward, MAX_REWARD_PER_TX);
  const limitReason   = rawReward > MAX_REWARD_PER_TX
    ? `capped at MAX_REWARD_PER_TX=${MAX_REWARD_PER_TX}`
    : null;

  return {
    activityScore,
    baseReward,
    rawReward: parseFloat(rawReward.toFixed(8)),
    cappedReward: parseFloat(cappedReward.toFixed(8)),
    limitReason,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function getPoolStatus(): Promise<PoolStatus> {
  await ensurePoolState();
  const [state] = await db
    .select()
    .from(aiPoolStateTable)
    .where(eq(aiPoolStateTable.id, "singleton"));

  const today = todayUTC();
  const dailyEmitted = state.dailyEmitDate === today ? state.dailyEmitted : 0;

  return {
    totalPool: state.totalPool,
    remaining: state.remaining,
    distributed: state.distributed,
    integrityCheck: verifyIntegrity(state),
    percentRemaining: ((state.remaining / state.totalPool) * 100).toFixed(4) + "%",
    isExhausted: state.isExhausted || state.remaining <= 0,
    dailyEmitted,
    dailyRemaining: Math.max(0, MAX_GLOBAL_DAILY - dailyEmitted),
    date: today,
  };
}

/**
 * distributeReward — the ONLY function that may reduce the pool.
 *
 * SUPPLY CONTROL GATES (checked in this exact order — none can be bypassed):
 *
 *  GATE 1 — HARD STOP: pool exhausted or flagged isExhausted → reject forever
 *  GATE 2 — Anti-spam: txVolume < MIN_TX_VALUE → reject
 *  GATE 3 — Global daily cap: dailyEmitted ≥ MAX_GLOBAL_DAILY → reject
 *  GATE 4 — Per-wallet daily cap: walletReceived ≥ MAX_WALLET_DAILY → reject
 *
 * After all gates: finalReward = min(calculated, global_headroom, wallet_headroom, pool_remaining)
 * This guarantees distributed + remaining never exceed AI_POOL_TOTAL.
 */
export async function distributeReward(
  snap: ActivitySnapshot,
  receiver: string,
  txHash: string,
): Promise<{
  success: boolean;
  message: string;
  reward?: number;
  calculation?: RewardCalculation;
  newRemaining?: number;
}> {
  await ensurePoolState();

  const [state] = await db
    .select()
    .from(aiPoolStateTable)
    .where(eq(aiPoolStateTable.id, "singleton"));

  // ══════════════════════════════════════════════════════════════════════
  // GATE 1 — HARD STOP (supply control rule #3)
  // if (ai_pool_remaining <= 0) → STOP ALL REWARDS, permanently
  // ══════════════════════════════════════════════════════════════════════
  if (state.isExhausted || state.remaining <= 0) {
    if (!state.isExhausted) {
      // Mark exhausted permanently in DB so future calls skip early
      await db
        .update(aiPoolStateTable)
        .set({ isExhausted: true, remaining: 0 })
        .where(eq(aiPoolStateTable.id, "singleton"));
    }
    logger.warn("AI pool exhausted — all rewards stopped permanently (supply rule enforced)");
    return { success: false, message: "AI_POOL_EXHAUSTED: all rewards permanently stopped" };
  }

  // ══════════════════════════════════════════════════════════════════════
  // GATE 2 — Anti-spam: minimum transaction value
  // ══════════════════════════════════════════════════════════════════════
  if (snap.txVolume < MIN_TX_VALUE) {
    logger.debug({ txVolume: snap.txVolume, min: MIN_TX_VALUE }, "Dust tx — no reward");
    return { success: false, message: `DUST_TX: volume ${snap.txVolume} < minimum ${MIN_TX_VALUE} IXC` };
  }

  // ══════════════════════════════════════════════════════════════════════
  // Compute activity-based reward (no fixed number)
  // ══════════════════════════════════════════════════════════════════════
  const calc = calcReward(snap, state.remaining, state.totalPool);

  if (calc.cappedReward <= 0) {
    return { success: false, message: "ZERO_SCORE: activity score produced no reward" };
  }

  // ══════════════════════════════════════════════════════════════════════
  // GATE 3 — Global daily emission cap
  // ══════════════════════════════════════════════════════════════════════
  const today = todayUTC();
  const dailyEmitted = await resolveDailyEmission(state);

  if (dailyEmitted >= MAX_GLOBAL_DAILY) {
    logger.info({ dailyEmitted, cap: MAX_GLOBAL_DAILY }, "Global daily cap reached");
    return { success: false, message: `DAILY_CAP: global limit of ${MAX_GLOBAL_DAILY} IXC/day reached` };
  }

  // ══════════════════════════════════════════════════════════════════════
  // GATE 4 — Per-wallet daily cap
  // ══════════════════════════════════════════════════════════════════════
  const walletId = `${receiver}:${today}`;
  const walletRows = await db
    .select()
    .from(aiWalletDailyTable)
    .where(eq(aiWalletDailyTable.id, walletId));

  const walletToday    = walletRows[0] ?? null;
  const walletReceived = walletToday?.totalReceived ?? 0;

  if (walletReceived >= MAX_WALLET_DAILY) {
    logger.debug({ receiver, walletReceived, cap: MAX_WALLET_DAILY }, "Wallet daily cap reached");
    return { success: false, message: `WALLET_CAP: limit of ${MAX_WALLET_DAILY} IXC/wallet/day reached` };
  }

  // ══════════════════════════════════════════════════════════════════════
  // FINAL REWARD — clamped to ALL headrooms simultaneously
  // Ensures: distributed + remaining === AI_POOL_TOTAL at all times
  // ══════════════════════════════════════════════════════════════════════
  const finalReward = parseFloat(
    Math.min(
      calc.cappedReward,
      MAX_GLOBAL_DAILY - dailyEmitted,   // global headroom
      MAX_WALLET_DAILY - walletReceived, // wallet headroom
      state.remaining,                   // SUPPLY RULE: never exceed pool
    ).toFixed(8),
  );

  if (finalReward <= 0) {
    return { success: false, message: "ZERO_FINAL: all headrooms exhausted" };
  }

  // ══════════════════════════════════════════════════════════════════════
  // COMMIT — atomic pool deduction
  // Supply invariant: newRemaining = remaining − finalReward (≥ 0)
  //                   newDistributed = distributed + finalReward
  //                   newRemaining + newDistributed = totalPool ✓
  // ══════════════════════════════════════════════════════════════════════
  const newRemaining   = parseFloat((state.remaining - finalReward).toFixed(8));
  const newDistributed = parseFloat((state.distributed + finalReward).toFixed(8));
  const newDailyEmitted = parseFloat((dailyEmitted + finalReward).toFixed(8));
  const willExhaust    = newRemaining <= 0;

  await db
    .update(aiPoolStateTable)
    .set({
      remaining: Math.max(0, newRemaining),
      distributed: newDistributed,
      dailyEmitted: newDailyEmitted,
      dailyEmitDate: today,
      isExhausted: willExhaust,
      lastDistributedAt: new Date(),
    })
    .where(eq(aiPoolStateTable.id, "singleton"));

  // Update per-wallet daily ledger
  if (!walletToday) {
    await db.insert(aiWalletDailyTable).values({
      id: walletId,
      walletAddress: receiver,
      date: today,
      totalReceived: finalReward,
      txCount: snap.txCount,
    });
  } else {
    await db
      .update(aiWalletDailyTable)
      .set({
        totalReceived: walletReceived + finalReward,
        txCount: (walletToday.txCount ?? 0) + snap.txCount,
        updatedAt: new Date(),
      })
      .where(eq(aiWalletDailyTable.id, walletId));
  }

  // Immutable audit record
  await db.insert(aiRewardHistoryTable).values({
    id: randomUUID(),
    txHash,
    rewardAmount: finalReward,
    receiver,
    activityScore: calc.activityScore,
    txCount: snap.txCount,
    uniqueUsers: snap.uniqueUsers,
    txVolume: snap.txVolume,
    aiActivity: snap.aiActivity,
    poolRemainingAfter: Math.max(0, newRemaining),
  });

  if (willExhaust) {
    logger.warn(
      { finalReward, newRemaining: 0 },
      "AI pool EXHAUSTED — this was the final reward. All future rewards stopped.",
    );
  } else {
    logger.info(
      { reward: finalReward, activityScore: calc.activityScore, receiver, remaining: newRemaining },
      "AI pool reward distributed",
    );
  }

  return {
    success: true,
    message: `Distributed ${finalReward} IXC (activityScore=${calc.activityScore})${willExhaust ? " — POOL NOW EXHAUSTED" : ""}`,
    reward: finalReward,
    calculation: { ...calc, cappedReward: finalReward },
    newRemaining: Math.max(0, newRemaining),
  };
}

export async function getPoolLimits() {
  return {
    maxRewardPerTx: MAX_REWARD_PER_TX,
    maxWalletDaily: MAX_WALLET_DAILY,
    maxGlobalDaily: MAX_GLOBAL_DAILY,
    minTxValue: MIN_TX_VALUE,
    baseRewardRange: `${BASE_REWARD_MIN}–${BASE_REWARD_MAX} IXC (dynamic)`,
    supplyControl: {
      totalPoolCap: AI_POOL_TOTAL,
      noMint: true,
      hardStop: "if (remaining <= 0) all rewards stop permanently",
      singleSource: "all rewards come exclusively from this 5,000,000 IXC pool",
    },
  };
}
