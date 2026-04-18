// ============================================================
// CONSENSUS_PROOF.TS — Layer 3: Consensus Proof Layer
// ─────────────────────────────────────────────────────────────
// Fungsi:
//   - Gabungkan semua hasil dari Layer 1 & Layer 2
//   - Buat laporan terstruktur (ValidatorReport)
//   - Tanda tangan kriptografis
//   - Multi-Validator Consensus
//   - Slashing & Challenge System
// ============================================================

import type {
  SimulationWitness,
  CognitiveAuditReport,
  ValidatorIdentity,
  ValidatorReport,
  ValidatorContribution,
  ConsensusState,
  SlashingEvent,
  ChallengeRecord,
  MultiValidatorConsensus,
  BehaviorMetrics,
  AnomalyFlag,
  RewardDistribution,
  NodeRewardEntry,
  AgentSnapshot,
} from "./types.js";
import {
  signReport,
  computeReportHash,
  stableStringify,
  sha256,
} from "./crypto.js";
import { logger } from '../lib/logger.js';

// ── CONSTANTS ─────────────────────────────────────────────────
const MIN_VALIDATORS_FOR_CONSENSUS = 2;
const CONSENSUS_AGREEMENT_THRESHOLD = 0.6; // 60% agreement needed
const SLASHING_CONSENSUS_DEVIATION = 0.4;  // >40% deviation triggers slash
const SLASHING_PERCENT = 0.1;             // 10% stake slashed
const CHALLENGE_WINDOW_MS = 30_000;        // 30 second challenge window
const DAILY_REWARD_POOL = 1000;            // MAKSIMAL 1000 IXC / HARI

// ── IN-MEMORY VALIDATOR REGISTRY ─────────────────────────────
const _validators = new Map<string, ValidatorIdentity>();
const _reports: ValidatorReport[] = [];
const _challenges: ChallengeRecord[] = [];
const _slashingEvents: SlashingEvent[] = [];

// ── INIT DEFAULT VALIDATORS ───────────────────────────────────
export function initConsensusValidators(): void {
  const defaults: ValidatorIdentity[] = [
    {
      validatorId: "cv_witness_1",
      validatorName: "SimulationWitness-Alpha",
      stake: 10000,
      reputation: 0.92,
      specialization: "witness",
      isActive: true,
    },
    {
      validatorId: "cv_cognitive_1",
      validatorName: "CognitiveAuditor-Prime",
      stake: 8500,
      reputation: 0.88,
      specialization: "cognitive",
      isActive: true,
    },
    {
      validatorId: "cv_consensus_1",
      validatorName: "ConsensusForge-Delta",
      stake: 7500,
      reputation: 0.85,
      specialization: "consensus",
      isActive: true,
    },
    {
      validatorId: "cv_evolution_1",
      validatorName: "EvolutionSentinel-Omega",
      stake: 6000,
      reputation: 0.82,
      specialization: "evolution",
      isActive: true,
    },
    {
      validatorId: "cv_economy_1",
      validatorName: "EconomyGuardian-Beta",
      stake: 6000,
      reputation: 0.80,
      specialization: "economy",
      isActive: true,
    },
  ];
  for (const v of defaults) {
    if (!_validators.has(v.validatorId)) {
      _validators.set(v.validatorId, v);
    }
  }
}

// ── REGISTER VALIDATOR ────────────────────────────────────────
export function registerConsensusValidator(params: {
  validatorId?: string;
  validatorName: string;
  stake: number;
  reputation?: number;
  specialization?: string;
}): ValidatorIdentity {
  const v: ValidatorIdentity = {
    validatorId: params.validatorId ?? `cv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    validatorName: params.validatorName,
    stake: params.stake,
    reputation: params.reputation ?? 0.5,
    specialization: params.specialization ?? "general",
    isActive: true,
  };
  _validators.set(v.validatorId, v);
  return v;
}

export function listConsensusValidators(): ValidatorIdentity[] {
  return Array.from(_validators.values());
}

// ── GET VALIDATOR WEIGHT ──────────────────────────────────────
function getValidatorWeight(v: ValidatorIdentity): number {
  return v.stake * v.reputation;
}

// ═══════════════════════════════════════════════════════════════
// COMPUTE PER-AGENT SCORES
// score = f(activity, intelligence, adaptability, impact, trust)
// ═══════════════════════════════════════════════════════════════
function computeAgentCombinedScore(
  agent: AgentSnapshot,
  auditMetrics: BehaviorMetrics,
): {
  agentId: string;
  rawScore: number;
  behaviorScore: number;
  evolutionScore: number;
  combinedScore: number;
} {
  const rawScore = agent.score ?? 0;
  const validationScore = agent.validationScore ?? 1.0;

  // Behavior contribution from cognitive audit (normalized per-agent ratios)
  const behaviorScore =
    (auditMetrics.intelligence_score * 0.25 +
      auditMetrics.adaptability_score * 0.25 +
      auditMetrics.social_complexity_score * 0.25 +
      auditMetrics.economic_activity_score * 0.25) /
    100;

  // Evolution/survival score
  const evolutionScore = Math.min(1, (agent.generationsSurvived ?? 0) * 0.1 + (agent.age / 200) * 0.5);

  // Combined: rawScore × validationScore × behavior + evolution bonus
  const combinedScore = parseFloat(
    (rawScore * validationScore * (0.7 + behaviorScore * 0.2 + evolutionScore * 0.1)).toFixed(6),
  );

  return {
    agentId: agent.id,
    rawScore,
    behaviorScore: parseFloat(behaviorScore.toFixed(6)),
    evolutionScore: parseFloat(evolutionScore.toFixed(6)),
    combinedScore,
  };
}

// ═══════════════════════════════════════════════════════════════
// CREATE VALIDATOR REPORT
// ═══════════════════════════════════════════════════════════════
export function createValidatorReport(
  validatorId: string,
  witness: SimulationWitness,
  audit: CognitiveAuditReport,
): ValidatorReport | null {
  const validator = _validators.get(validatorId);
  if (!validator || !validator.isActive) return null;

  const timestamp = Date.now();

  // Compute per-agent scores
  const perAgentScores = witness.agentSnapshots
    .filter((a) => a.isAlive)
    .map((agent) => {
      const agentAuditMetrics = audit.perAgentMetrics.get(agent.id) ?? audit.behaviorMetrics;
      return computeAgentCombinedScore(agent, agentAuditMetrics);
    });

  // Build report content (without signature) for hashing
  const reportContent = {
    validatorId,
    cycle: witness.cycle,
    timestamp,
    state_proof: {
      state_root_hash: witness.state_root_hash,
      event_merkle_root: witness.event_merkle_root,
      world_state_hash: witness.world_state_hash,
      simulation_proof: witness.simulation_proof,
      witnessedAgents: witness.agentCount,
      deterministicSeed: witness.deterministicSeed,
    },
    behavior_metrics: audit.behaviorMetrics,
    anomaly_flags: audit.anomalyFlags,
    perAgentScores,
  };

  const reportHash = computeReportHash(reportContent);
  const validator_signature = signReport(stableStringify(reportContent), validatorId, validator.stake);
  const reportId = sha256(`report:${validatorId}:${witness.cycle}:${timestamp}`).slice(0, 32);

  const report: ValidatorReport = {
    reportId,
    validatorId,
    cycle: witness.cycle,
    timestamp,
    state_proof: reportContent.state_proof,
    behavior_metrics: reportContent.behavior_metrics,
    anomaly_flags: reportContent.anomaly_flags,
    perAgentScores,
    validator_signature,
    reportHash,
    isValid: true,
  };

  _reports.push(report);
  if (_reports.length > 200) {
    _reports.splice(0, _reports.length - 200);
  }

  logger.info(
    {
      reportId,
      validatorId,
      validator: validator.validatorName,
      cycle: witness.cycle,
      agentsScored: perAgentScores.length,
      anomalies: audit.anomalyFlags.length,
      reportHash: reportHash.slice(0, 16) + "...",
    },
    "[ConsensusProof] ValidatorReport created",
  );

  return report;
}

// ═══════════════════════════════════════════════════════════════
// REWARD DISTRIBUTION
// BATAS GLOBAL: MAKSIMAL 1000 IXC / HARI
// reward_node = (node_score / total_network_score) × 1000
// ═══════════════════════════════════════════════════════════════
function computeRewardDistribution(
  reports: ValidatorReport[],
  cycle: number,
): RewardDistribution {
  // Aggregate per-agent scores across all validator reports (weighted by reputation)
  const agentScoreMap = new Map<string, { scores: number[]; weights: number[] }>();

  for (const report of reports) {
    const validator = _validators.get(report.validatorId);
    const weight = validator ? getValidatorWeight(validator) : 1;

    for (const entry of report.perAgentScores) {
      let existing = agentScoreMap.get(entry.agentId);
      if (!existing) {
        existing = { scores: [], weights: [] };
        agentScoreMap.set(entry.agentId, existing);
      }
      existing.scores.push(entry.combinedScore);
      existing.weights.push(weight);
    }
  }

  // Weighted average score per agent
  const agentFinalScores = new Map<string, number>();
  for (const [agentId, data] of agentScoreMap.entries()) {
    const totalWeight = data.weights.reduce((s, w) => s + w, 0);
    const weightedSum = data.scores.reduce((s, score, i) => s + score * (data.weights[i] ?? 1), 0);
    agentFinalScores.set(agentId, totalWeight > 0 ? weightedSum / totalWeight : 0);
  }

  const totalNetworkScore = Array.from(agentFinalScores.values()).reduce((s, v) => s + v, 0);

  const entries: NodeRewardEntry[] = [];
  let totalDistributed = 0;

  if (totalNetworkScore > 0) {
    for (const [nodeId, nodeScore] of agentFinalScores.entries()) {
      if (nodeScore <= 0) continue;

      const sharePercent = nodeScore / totalNetworkScore;
      const rawReward = sharePercent * DAILY_REWARD_POOL;
      const rewardIXC = parseFloat(rawReward.toFixed(8));

      totalDistributed += rewardIXC;
      entries.push({
        nodeId,
        nodeScore: parseFloat(nodeScore.toFixed(6)),
        totalNetworkScore: parseFloat(totalNetworkScore.toFixed(6)),
        sharePercent: parseFloat((sharePercent * 100).toFixed(6)),
        rewardIXC,
        cappedAt1000: false,
      });
    }
  }

  // Enforce global 1000 IXC/day cap
  if (totalDistributed > DAILY_REWARD_POOL) {
    const scaleFactor = DAILY_REWARD_POOL / totalDistributed;
    for (const entry of entries) {
      entry.rewardIXC = parseFloat((entry.rewardIXC * scaleFactor).toFixed(8));
      entry.cappedAt1000 = true;
    }
    totalDistributed = DAILY_REWARD_POOL;
  }

  // Sort by reward desc
  entries.sort((a, b) => b.rewardIXC - a.rewardIXC);

  return {
    distributionId: sha256(`dist:${cycle}:${Date.now()}`).slice(0, 32),
    cycle,
    timestamp: Date.now(),
    totalDailyPool: DAILY_REWARD_POOL,
    totalNetworkScore: parseFloat(totalNetworkScore.toFixed(6)),
    eligibleNodes: entries.length,
    entries,
    totalDistributed: parseFloat(totalDistributed.toFixed(8)),
    remainingPool: parseFloat((DAILY_REWARD_POOL - Math.min(totalDistributed, DAILY_REWARD_POOL)).toFixed(8)),
    note: "Reward bukan per laporan — berbasis kontribusi relatif. Tidak boleh melebihi 1000 IXC/hari.",
  };
}

// ═══════════════════════════════════════════════════════════════
// CONSENSUS CALCULATION
// ═══════════════════════════════════════════════════════════════
function computeConsensus(reports: ValidatorReport[], cycle: number): ConsensusState {
  const n = reports.length;
  const hasConsensus = n >= MIN_VALIDATORS_FOR_CONSENSUS;

  if (!hasConsensus) {
    return {
      consensusId: sha256(`consensus:${cycle}:${Date.now()}`).slice(0, 32),
      cycle,
      participatingValidators: n,
      requiredValidators: MIN_VALIDATORS_FOR_CONSENSUS,
      hasConsensus: false,
      agreementScore: 0,
      challengeWindow: false,
      challengesRaised: _challenges.filter((c) => c.status === "PENDING").length,
    };
  }

  // Agreement score: how similar are the anomaly counts across validators?
  const anomalyCounts = reports.map((r) => r.anomaly_flags.length);
  const avgAnomalies = anomalyCounts.reduce((s, v) => s + v, 0) / n;
  const variance =
    anomalyCounts.reduce((s, v) => s + Math.pow(v - avgAnomalies, 2), 0) / n;
  const agreementScore = Math.max(0, 1 - Math.sqrt(variance) / (avgAnomalies + 1));

  const now = Date.now();
  const latestReport = reports[reports.length - 1];
  const challengeWindow =
    !!latestReport && now - latestReport.timestamp < CHALLENGE_WINDOW_MS;

  return {
    consensusId: sha256(`consensus:${cycle}:${Date.now()}`).slice(0, 32),
    cycle,
    participatingValidators: n,
    requiredValidators: MIN_VALIDATORS_FOR_CONSENSUS,
    hasConsensus: agreementScore >= CONSENSUS_AGREEMENT_THRESHOLD,
    agreementScore: parseFloat(agreementScore.toFixed(4)),
    challengeWindow,
    challengesRaised: _challenges.filter(
      (c) => c.status === "PENDING" && c.reportId === (latestReport?.reportId ?? ""),
    ).length,
  };
}

// ═══════════════════════════════════════════════════════════════
// COMPUTE CONTRIBUTIONS
// ═══════════════════════════════════════════════════════════════
function computeContributions(
  reports: ValidatorReport[],
  totalAgents: number,
): ValidatorContribution[] {
  return reports.map((report) => {
    const validator = _validators.get(report.validatorId);
    const reputationWeight = validator ? getValidatorWeight(validator) : 1;

    const witnessCoverage =
      totalAgents > 0 ? Math.min(1, report.perAgentScores.length / totalAgents) : 0;
    const auditDepth = report.anomaly_flags.length > 0 ? 1.0 : 0.7;
    const anomaliesFound = report.anomaly_flags.length;

    return {
      validatorId: report.validatorId,
      witnessCoverage: parseFloat(witnessCoverage.toFixed(4)),
      auditDepth: parseFloat(auditDepth.toFixed(4)),
      anomaliesFound,
      consensusAgreement: 1.0,
      reputationWeight: parseFloat(reputationWeight.toFixed(2)),
    } satisfies ValidatorContribution;
  });
}

// ═══════════════════════════════════════════════════════════════
// SLASHING — validator salah → stake dipotong
// ═══════════════════════════════════════════════════════════════
function applySlashing(
  reports: ValidatorReport[],
  consensus: ConsensusState,
): SlashingEvent[] {
  const events: SlashingEvent[] = [];
  if (!consensus.hasConsensus) return events;

  // Slash validators whose anomaly counts deviate significantly
  const anomalyCounts = reports.map((r) => ({
    validatorId: r.validatorId,
    count: r.anomaly_flags.length,
  }));
  const avgCount =
    anomalyCounts.reduce((s, v) => s + v.count, 0) / Math.max(anomalyCounts.length, 1);

  for (const { validatorId, count } of anomalyCounts) {
    const deviation = Math.abs(count - avgCount) / (avgCount + 1);
    if (deviation > SLASHING_CONSENSUS_DEVIATION) {
      const validator = _validators.get(validatorId);
      if (!validator) continue;

      const stakeSlashed = parseFloat((validator.stake * SLASHING_PERCENT).toFixed(4));
      const reputationPenalty = 0.05;

      validator.stake = Math.max(0, validator.stake - stakeSlashed);
      validator.reputation = Math.max(0.1, validator.reputation - reputationPenalty);

      const slashEvent: SlashingEvent = {
        slashId: sha256(`slash:${validatorId}:${Date.now()}`).slice(0, 16),
        validatorId,
        reason: "CONSENSUS_DEVIATION",
        stakeSlashed,
        reputationPenalty,
        timestamp: Date.now(),
      };

      _slashingEvents.push(slashEvent);
      events.push(slashEvent);

      logger.warn(
        {
          validatorId,
          deviation: deviation.toFixed(3),
          stakeSlashed,
          newStake: validator.stake,
        },
        "[ConsensusProof] Validator slashed for consensus deviation",
      );
    }
  }

  return events;
}

// ═══════════════════════════════════════════════════════════════
// CHALLENGE SYSTEM
// ═══════════════════════════════════════════════════════════════
export function raiseChallenge(params: {
  reportId: string;
  challengerId: string;
  targetId: string;
  reason: string;
  evidence: Record<string, unknown>;
}): ChallengeRecord {
  const challenge: ChallengeRecord = {
    challengeId: sha256(`challenge:${params.reportId}:${Date.now()}`).slice(0, 24),
    reportId: params.reportId,
    challengerId: params.challengerId,
    targetId: params.targetId,
    reason: params.reason,
    evidence: params.evidence,
    status: "PENDING",
    timestamp: Date.now(),
  };
  _challenges.push(challenge);

  logger.info(
    {
      challengeId: challenge.challengeId,
      reportId: params.reportId,
      challenger: params.challengerId,
      target: params.targetId,
    },
    "[ConsensusProof] Challenge raised",
  );

  return challenge;
}

export function resolveChallenge(
  challengeId: string,
  isValid: boolean,
): ChallengeRecord | null {
  const challenge = _challenges.find((c) => c.challengeId === challengeId);
  if (!challenge || challenge.status !== "PENDING") return null;

  challenge.status = isValid ? "RESOLVED_VALID" : "RESOLVED_INVALID";
  challenge.resolvedAt = Date.now();

  // If challenge is valid, slash the target validator
  if (isValid) {
    const validator = _validators.get(challenge.targetId);
    if (validator) {
      const stakeSlashed = parseFloat((validator.stake * SLASHING_PERCENT).toFixed(4));
      validator.stake = Math.max(0, validator.stake - stakeSlashed);
      validator.reputation = Math.max(0.1, validator.reputation - 0.1);

      _slashingEvents.push({
        slashId: sha256(`slash:${challenge.challengeId}:${Date.now()}`).slice(0, 16),
        validatorId: challenge.targetId,
        reason: "CHALLENGE_LOST",
        stakeSlashed,
        reputationPenalty: 0.1,
        timestamp: Date.now(),
      });
    }
  } else {
    // Challenger loses reputation
    const challenger = _validators.get(challenge.challengerId);
    if (challenger) {
      challenger.reputation = Math.max(0.1, challenger.reputation - 0.03);
    }
  }

  return challenge;
}

// ═══════════════════════════════════════════════════════════════
// MERGE ANOMALY FLAGS — Union of all validator anomalies
// ═══════════════════════════════════════════════════════════════
function mergeAnomalyFlags(reports: ValidatorReport[]): AnomalyFlag[] {
  const seen = new Set<string>();
  const merged: AnomalyFlag[] = [];

  for (const report of reports) {
    for (const flag of report.anomaly_flags) {
      const key = `${flag.type}:${flag.agentIds.sort().join(",")}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(flag);
      }
    }
  }

  // Sort by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  merged.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
  return merged;
}

// ═══════════════════════════════════════════════════════════════
// WEIGHTED AVERAGE BEHAVIOR METRICS
// ═══════════════════════════════════════════════════════════════
function mergeBehaviorMetrics(reports: ValidatorReport[]): BehaviorMetrics {
  if (reports.length === 0) {
    return {
      intelligence_score: 0,
      adaptability_score: 0,
      social_complexity_score: 0,
      economic_activity_score: 0,
    };
  }

  let totalWeight = 0;
  let sumIntel = 0;
  let sumAdapt = 0;
  let sumSocial = 0;
  let sumEcon = 0;

  for (const report of reports) {
    const validator = _validators.get(report.validatorId);
    const weight = validator ? getValidatorWeight(validator) : 1;
    totalWeight += weight;
    sumIntel += report.behavior_metrics.intelligence_score * weight;
    sumAdapt += report.behavior_metrics.adaptability_score * weight;
    sumSocial += report.behavior_metrics.social_complexity_score * weight;
    sumEcon += report.behavior_metrics.economic_activity_score * weight;
  }

  const w = Math.max(totalWeight, 1);
  return {
    intelligence_score: parseFloat((sumIntel / w).toFixed(4)),
    adaptability_score: parseFloat((sumAdapt / w).toFixed(4)),
    social_complexity_score: parseFloat((sumSocial / w).toFixed(4)),
    economic_activity_score: parseFloat((sumEcon / w).toFixed(4)),
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN: RUN MULTI-VALIDATOR CONSENSUS
// ═══════════════════════════════════════════════════════════════
export function runMultiValidatorConsensus(
  witness: SimulationWitness,
  audit: CognitiveAuditReport,
): MultiValidatorConsensus {
  const activeValidators = Array.from(_validators.values()).filter((v) => v.isActive);

  if (activeValidators.length === 0) {
    initConsensusValidators();
  }

  const cycle = witness.cycle;
  const timestamp = Date.now();

  // Each validator creates a report
  const reports: ValidatorReport[] = [];
  for (const validator of activeValidators.filter((v) => v.isActive)) {
    const report = createValidatorReport(validator.validatorId, witness, audit);
    if (report) reports.push(report);
  }

  // Compute consensus
  const consensus = computeConsensus(reports, cycle);

  // Compute contributions
  const contributions = computeContributions(reports, witness.agentCount);

  // Merge final behavior metrics (weighted average)
  const finalBehaviorMetrics = mergeBehaviorMetrics(reports);

  // Merge all anomaly flags (union, deduped)
  const finalAnomalyFlags = mergeAnomalyFlags(reports);

  // Compute reward distribution
  const finalRewardDistribution = computeRewardDistribution(reports, cycle);

  // Apply slashing if needed
  const slashingEvents = applySlashing(reports, consensus);

  const consensusId = sha256(`mc:${cycle}:${timestamp}`).slice(0, 32);

  const result: MultiValidatorConsensus = {
    consensusId,
    cycle,
    timestamp,
    reports,
    consensus,
    contributions,
    finalBehaviorMetrics,
    finalAnomalyFlags,
    finalRewardDistribution,
    slashingEvents,
    challenges: _challenges.filter(
      (c) => reports.some((r) => r.reportId === c.reportId),
    ),
  };

  logger.info(
    {
      consensusId,
      cycle,
      validatorsParticipated: reports.length,
      hasConsensus: consensus.hasConsensus,
      agreementScore: consensus.agreementScore,
      anomalies: finalAnomalyFlags.length,
      totalReward: finalRewardDistribution.totalDistributed.toFixed(4),
      slashingEvents: slashingEvents.length,
    },
    "[ConsensusProof] Multi-validator consensus complete",
  );

  return result;
}

// ── ACCESSORS ─────────────────────────────────────────────────
export function getRecentReports(limit = 20): ValidatorReport[] {
  return _reports.slice(-limit);
}

export function getSlashingHistory(): SlashingEvent[] {
  return _slashingEvents;
}

export function getChallengeHistory(): ChallengeRecord[] {
  return _challenges;
}

export function getValidatorStats() {
  return {
    totalValidators: _validators.size,
    activeValidators: Array.from(_validators.values()).filter((v) => v.isActive).length,
    totalReports: _reports.length,
    totalChallenges: _challenges.length,
    totalSlashings: _slashingEvents.length,
    pendingChallenges: _challenges.filter((c) => c.status === "PENDING").length,
  };
}
