import { Router, type IRouter } from "express";
import {
  getPoolStatus,
  getPoolLimits,
  calcActivityScore,
  calcBaseReward,
  AI_POOL_TOTAL,
} from "../../ecosystem/pool.js";
import {
  getRewardHistory,
  getRewardStats,
  getWalletDailyStatus,
} from "../../ecosystem/reward-history.js";

const router: IRouter = Router();

/**
 * GET /ai/pool/status
 * Returns current pool balance, exhaustion state, daily emission, and
 * integrity check (distributed + remaining === 5,000,000).
 */
router.get("/ai/pool/status", async (_req, res): Promise<void> => {
  try {
    const [status, limits] = await Promise.all([getPoolStatus(), getPoolLimits()]);
    res.json({
      pool: status,
      limits,
      supplyControl: {
        rule: "ALL rewards come from the 5,000,000 IXC pool only — no minting",
        hardStop: status.isExhausted
          ? "POOL EXHAUSTED — all rewards stopped permanently"
          : "Pool active",
        integrityCheck: status.integrityCheck
          ? "PASS — distributed + remaining = 5,000,000"
          : "FAIL — integrity violation detected",
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to retrieve pool status" });
  }
});

/**
 * GET /ai/pool/history?limit=50
 * Full reward history with per-event activity scores and pool balance trail.
 */
router.get("/ai/pool/history", async (req, res): Promise<void> => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) ?? "50", 10), 200);
    const [history, stats] = await Promise.all([getRewardHistory(limit), getRewardStats()]);
    res.json({ stats, history });
  } catch {
    res.status(500).json({ error: "Failed to retrieve reward history" });
  }
});

/**
 * GET /ai/pool/wallet/:address
 * Today's reward total for a specific wallet (anti-abuse transparency).
 */
router.get("/ai/pool/wallet/:address", async (req, res): Promise<void> => {
  try {
    const today  = new Date().toISOString().slice(0, 10);
    const status = await getWalletDailyStatus(req.params.address);
    res.json({
      wallet: req.params.address,
      today: status ?? { totalReceived: 0, txCount: 0, date: today },
    });
  } catch {
    res.status(500).json({ error: "Failed to retrieve wallet status" });
  }
});

/**
 * GET /ai/pool/formula
 * Live reward formula explanation with worked examples at current pool level.
 */
router.get("/ai/pool/formula", async (_req, res): Promise<void> => {
  try {
    const status     = await getPoolStatus();
    const baseReward = calcBaseReward(status.remaining, status.totalPool);

    const examples = [
      { label: "dust_rejected",   snap: { txCount: 10, uniqueUsers: 5, txVolume: 0.0005, aiActivity: 0 }, note: "REJECTED — below MIN_TX_VALUE" },
      { label: "low_activity",    snap: { txCount: 1,  uniqueUsers: 1, txVolume: 0.01,   aiActivity: 0 } },
      { label: "medium_activity", snap: { txCount: 5,  uniqueUsers: 3, txVolume: 5,      aiActivity: 2 } },
      { label: "high_activity",   snap: { txCount: 20, uniqueUsers: 15, txVolume: 50,    aiActivity: 5 } },
    ].map(({ label, snap, note }) => {
      const score    = calcActivityScore(snap);
      const raw      = baseReward * score;
      const capped   = Math.min(raw, 0.1);
      return { label, snap, activityScore: score, rawReward: +raw.toFixed(8), finalReward: +capped.toFixed(8), note: note ?? null };
    });

    res.json({
      formula: {
        activityScore: "txCount×0.4 + uniqueUsers×0.3 + min(txVolume,100)×0.2 + aiActivity×0.1",
        baseReward:    `${baseReward.toFixed(6)} IXC — shrinks as pool depletes (${status.percentRemaining} remaining)`,
        finalReward:   "baseReward × activityScore, capped at 0.1 IXC per event",
      },
      supplyControl: await getPoolLimits(),
      currentBaseReward: baseReward,
      examples,
    });
  } catch {
    res.status(500).json({ error: "Failed to compute formula" });
  }
});

export default router;
