// ============================================================
// ROUTES/VALIDATOR.TS — REST API for Advanced Validator System
// ============================================================

import { Router, type IRouter } from "express";
import {
  initValidatorEngine,
  runValidatorCycle,
  runStandaloneValidatorCycle,
  getValidatorSystemStatus,
  getLatestCycleResult,
  getCycleHistory,
  listConsensusValidators,
  registerConsensusValidator,
  getRecentReports,
  getSlashingHistory,
  getChallengeHistory,
  getValidatorStats,
  raiseChallenge,
  resolveChallenge,
  getLatestWitness,
  getWitnessHistory,
  verifySimulationWitness,
} from "../validator/validator_engine.js";

const router: IRouter = Router();

// Initialize on first import
initValidatorEngine();

// ── GET /validator/status ─────────────────────────────────
// Overview: system status, latest cycle, validator list
router.get("/validator/status", (_req, res) => {
  const status = getValidatorSystemStatus();
  res.json(status);
});

// ── POST /validator/run ───────────────────────────────────
// Run a standalone validator cycle (uses mock data if no state)
router.post("/validator/run", (_req, res) => {
  const result = runStandaloneValidatorCycle();
  res.json({
    success: true,
    consensusId: result.consensusId,
    cycle: result.cycle,
    timestamp: result.timestamp,
    hasConsensus: result.consensus.hasConsensus,
    agreementScore: result.consensus.agreementScore,
    participatingValidators: result.consensus.participatingValidators,
    finalBehaviorMetrics: result.finalBehaviorMetrics,
    anomalyCount: result.finalAnomalyFlags.length,
    rewardDistribution: {
      totalDistributed: result.finalRewardDistribution.totalDistributed,
      eligibleNodes: result.finalRewardDistribution.eligibleNodes,
      totalDailyPool: result.finalRewardDistribution.totalDailyPool,
      note: result.finalRewardDistribution.note,
    },
    slashingEvents: result.slashingEvents.length,
  });
});

// ── GET /validator/latest ─────────────────────────────────
// Full latest consensus result
router.get("/validator/latest", (_req, res) => {
  const latest = getLatestCycleResult();
  if (!latest) {
    res.status(404).json({ error: "No validator cycle has been run yet" });
    return;
  }

  // Return with perAgentMetrics serialized (Map → Object)
  const serialized = {
    ...latest,
    // reports contain Maps in perAgentScores — those are already serializable
  };
  res.json(serialized);
});

// ── GET /validator/history ────────────────────────────────
// Cycle history (summary)
router.get("/validator/history", (_req, res) => {
  const history = getCycleHistory();
  res.json(
    history.map((c) => ({
      consensusId: c.consensusId,
      cycle: c.cycle,
      timestamp: c.timestamp,
      hasConsensus: c.consensus.hasConsensus,
      agreementScore: c.consensus.agreementScore,
      participatingValidators: c.consensus.participatingValidators,
      anomalies: c.finalAnomalyFlags.length,
      totalReward: c.finalRewardDistribution.totalDistributed,
      networkHealth: {
        intelligence: c.finalBehaviorMetrics.intelligence_score,
        adaptability: c.finalBehaviorMetrics.adaptability_score,
        socialComplexity: c.finalBehaviorMetrics.social_complexity_score,
        economicActivity: c.finalBehaviorMetrics.economic_activity_score,
      },
    })),
  );
});

// ── GET /validator/validators ────────────────────────────
// List all registered validators
router.get("/validator/validators", (_req, res) => {
  const validators = listConsensusValidators();
  const stats = getValidatorStats();
  res.json({ validators, stats });
});

// ── POST /validator/validators/register ───────────────────
// Register a new validator
router.post("/validator/validators/register", (req, res) => {
  const { validatorName, stake, reputation, specialization } = req.body as {
    validatorName?: string;
    stake?: number;
    reputation?: number;
    specialization?: string;
  };

  if (!validatorName || typeof stake !== "number") {
    res.status(400).json({ error: "validatorName and stake are required" });
    return;
  }

  const validator = registerConsensusValidator({
    validatorName,
    stake,
    reputation,
    specialization,
  });

  res.json({ success: true, validator });
});

// ── GET /validator/witness/latest ────────────────────────
// Latest simulation witness snapshot
router.get("/validator/witness/latest", (_req, res) => {
  const witness = getLatestWitness();
  if (!witness) {
    res.status(404).json({ error: "No witness snapshot available" });
    return;
  }

  // Return summary (without full agent list for brevity)
  res.json({
    witnessId: witness.witnessId,
    cycle: witness.cycle,
    timestamp: witness.timestamp,
    agentCount: witness.agentCount,
    aliveCount: witness.aliveCount,
    state_root_hash: witness.state_root_hash,
    event_merkle_root: witness.event_merkle_root,
    world_state_hash: witness.world_state_hash,
    simulation_proof: witness.simulation_proof,
    deterministicSeed: witness.deterministicSeed,
    worldSnapshot: witness.worldSnapshot,
  });
});

// ── POST /validator/witness/verify ───────────────────────
// Verify a simulation witness (replay integrity check)
router.post("/validator/witness/verify", (_req, res) => {
  const witness = getLatestWitness();
  if (!witness) {
    res.status(404).json({ error: "No witness to verify" });
    return;
  }

  const isValid = verifySimulationWitness(witness);
  res.json({
    witnessId: witness.witnessId,
    cycle: witness.cycle,
    isValid,
    state_root_hash: witness.state_root_hash,
    simulation_proof: witness.simulation_proof,
    message: isValid
      ? "Simulation proof verified — deterministic replay matches"
      : "INTEGRITY FAILURE — proof mismatch detected",
  });
});

// ── GET /validator/witness/history ───────────────────────
// Recent witness history
router.get("/validator/witness/history", (_req, res) => {
  const history = getWitnessHistory().slice(-20);
  res.json(
    history.map((w) => ({
      witnessId: w.witnessId,
      cycle: w.cycle,
      timestamp: w.timestamp,
      agentCount: w.agentCount,
      aliveCount: w.aliveCount,
      state_root_hash: w.state_root_hash,
      event_merkle_root: w.event_merkle_root,
      simulation_proof: w.simulation_proof,
    })),
  );
});

// ── GET /validator/reports ────────────────────────────────
// Recent validator reports
router.get("/validator/reports", (req, res) => {
  const limit = Math.min(parseInt(String(req.query["limit"] ?? "20"), 10), 50);
  const reports = getRecentReports(limit);
  res.json(
    reports.map((r) => ({
      reportId: r.reportId,
      validatorId: r.validatorId,
      cycle: r.cycle,
      timestamp: r.timestamp,
      state_proof: r.state_proof,
      behavior_metrics: r.behavior_metrics,
      anomaly_count: r.anomaly_flags.length,
      anomaly_flags: r.anomaly_flags,
      agents_scored: r.perAgentScores.length,
      validator_signature: r.validator_signature,
      reportHash: r.reportHash,
      isValid: r.isValid,
    })),
  );
});

// ── GET /validator/rewards ────────────────────────────────
// Latest reward distribution
router.get("/validator/rewards", (_req, res) => {
  const latest = getLatestCycleResult();
  if (!latest) {
    res.status(404).json({ error: "No reward distribution available" });
    return;
  }
  res.json(latest.finalRewardDistribution);
});

// ── GET /validator/anomalies ─────────────────────────────
// Latest anomaly flags (merged from all validators)
router.get("/validator/anomalies", (_req, res) => {
  const latest = getLatestCycleResult();
  if (!latest) {
    res.json({ anomalies: [], cycle: null });
    return;
  }
  res.json({
    cycle: latest.cycle,
    consensusId: latest.consensusId,
    anomalies: latest.finalAnomalyFlags,
    count: latest.finalAnomalyFlags.length,
  });
});

// ── GET /validator/slashing ───────────────────────────────
// Slashing history
router.get("/validator/slashing", (_req, res) => {
  res.json({
    slashingEvents: getSlashingHistory(),
    total: getSlashingHistory().length,
  });
});

// ── GET /validator/challenges ────────────────────────────
// Challenge records
router.get("/validator/challenges", (_req, res) => {
  res.json({
    challenges: getChallengeHistory(),
    total: getChallengeHistory().length,
    pending: getChallengeHistory().filter((c) => c.status === "PENDING").length,
  });
});

// ── POST /validator/challenges/raise ─────────────────────
// Raise a challenge against a validator report
router.post("/validator/challenges/raise", (req, res) => {
  const { reportId, challengerId, targetId, reason, evidence } = req.body as {
    reportId?: string;
    challengerId?: string;
    targetId?: string;
    reason?: string;
    evidence?: Record<string, unknown>;
  };

  if (!reportId || !challengerId || !targetId || !reason) {
    res.status(400).json({
      error: "reportId, challengerId, targetId, and reason are required",
    });
    return;
  }

  const challenge = raiseChallenge({
    reportId,
    challengerId,
    targetId,
    reason,
    evidence: evidence ?? {},
  });

  res.json({ success: true, challenge });
});

// ── POST /validator/challenges/:id/resolve ───────────────
// Resolve a pending challenge
router.post("/validator/challenges/:id/resolve", (req, res) => {
  const { id } = req.params as { id: string };
  const { isValid } = req.body as { isValid?: boolean };

  if (typeof isValid !== "boolean") {
    res.status(400).json({ error: "isValid (boolean) is required" });
    return;
  }

  const challenge = resolveChallenge(id, isValid);
  if (!challenge) {
    res.status(404).json({ error: "Challenge not found or already resolved" });
    return;
  }

  res.json({ success: true, challenge });
});

// ── GET /validator/behavior ───────────────────────────────
// Latest behavior metrics from consensus
router.get("/validator/behavior", (_req, res) => {
  const latest = getLatestCycleResult();
  if (!latest) {
    res.status(404).json({ error: "No behavior data available" });
    return;
  }
  res.json({
    cycle: latest.cycle,
    consensusId: latest.consensusId,
    finalBehaviorMetrics: latest.finalBehaviorMetrics,
    contributions: latest.contributions,
  });
});

// ── GET /validator/consensus ─────────────────────────────
// Latest consensus state
router.get("/validator/consensus", (_req, res) => {
  const latest = getLatestCycleResult();
  if (!latest) {
    res.status(404).json({ error: "No consensus data available" });
    return;
  }
  res.json({
    consensusId: latest.consensusId,
    cycle: latest.cycle,
    timestamp: latest.timestamp,
    consensus: latest.consensus,
    participatingValidators: latest.reports.map((r) => ({
      validatorId: r.validatorId,
      reportId: r.reportId,
      agentsScored: r.perAgentScores.length,
      anomalies: r.anomaly_flags.length,
      signature: r.validator_signature.slice(0, 16) + "...",
    })),
  });
});

export default router;
