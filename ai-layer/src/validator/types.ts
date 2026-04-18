// ============================================================
// VALIDATOR TYPES — Advanced Validator System
// AI Digital Civilization Validator Architecture
// 3 Layers: Simulation Witness | Cognitive Audit | Consensus Proof
// ============================================================

// ── AI AGENT SNAPSHOT (read-only view) ───────────────────────
export interface AgentSnapshot {
  id: string;
  name: string;
  isAlive: boolean;
  energy: number;
  wealth: number;
  age: number;
  rank: string;
  ideology: string;
  primaryGoal: string;
  actionCount: number;
  groupId: string | null;
  friendCount: number;
  enemyCount: number;
  metrics?: {
    activity: number;
    interaction: number;
    economy: number;
    evolution: number;
  };
  score?: number;
  validationScore?: number;
  finalScore?: number;
  lastAction?: string;
  evolutionScore?: number;
  generationsSurvived?: number;
}

// ── EVENT LOG ENTRY ───────────────────────────────────────────
export interface SimulationEvent {
  id: string;
  type: string;
  actorId?: string;
  targetId?: string;
  groupId?: string;
  description: string;
  timestamp: number;
  cycle: number;
}

// ── WORLD STATE SNAPSHOT ──────────────────────────────────────
export interface WorldSnapshot {
  cycle: number;
  resourceLevel: number;
  dangerLevel: number;
  activityLevel: number;
  alivePopulation: number;
  totalBirths: number;
  totalDeaths: number;
  totalInteractions: number;
  tradeVolume: number;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════
// LAYER 1: SIMULATION WITNESS LAYER
// ═══════════════════════════════════════════════════════════════

export interface SimulationWitness {
  witnessId: string;
  cycle: number;
  timestamp: number;
  agentCount: number;
  aliveCount: number;
  state_root_hash: string;       // SHA-256 Merkle root of all agent states
  event_merkle_root: string;     // Merkle root of event log
  world_state_hash: string;      // SHA-256 of world state
  simulation_proof: string;      // Combined deterministic proof
  agentSnapshots: AgentSnapshot[];
  eventSample: SimulationEvent[];
  worldSnapshot: WorldSnapshot;
  deterministicSeed: string;     // Seed for replay verification
}

// ═══════════════════════════════════════════════════════════════
// LAYER 2: COGNITIVE AUDIT LAYER
// ═══════════════════════════════════════════════════════════════

export interface BehaviorMetrics {
  intelligence_score: number;      // 0–100: reasoning, goal adaptation
  adaptability_score: number;      // 0–100: survival under changing conditions
  social_complexity_score: number; // 0–100: network depth, alliances, trade
  economic_activity_score: number; // 0–100: wealth generation, trade volume
}

export interface SocialGraphNode {
  agentId: string;
  friendCount: number;
  enemyCount: number;
  groupMembership: boolean;
  centralityScore: number;   // How connected this node is
}

export interface BehavioralFingerprint {
  agentId: string;
  actionDistribution: Record<string, number>; // action → frequency
  ideologyConsistency: number;  // 0–1: does behavior match ideology?
  goalPersistence: number;      // 0–1: does agent stick to goals?
  cloneRiskScore: number;       // 0–1: higher = more likely clone pattern
}

export interface AnomalyFlag {
  type:
    | "CLONE_DETECTED"
    | "COLLUSION_DETECTED"
    | "SCORE_SPIKE"
    | "DEAD_AGENT_ACTIVE"
    | "NEGATIVE_CONTRIBUTION"
    | "SYBIL_PATTERN";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  agentIds: string[];
  description: string;
  timestamp: number;
  evidence: Record<string, unknown>;
}

export interface EvolutionValidation {
  agentId: string;
  isEvolving: boolean;          // true if score trend is positive
  evolutionRate: number;        // score change per cycle
  adaptationQuality: number;    // how well AI adapted to environment changes
  survivalStrength: number;     // 0–1: energy + age ratio
  naturalSelectionScore: number; // composite: survival + adaptation + contribution
}

export interface CognitiveAuditReport {
  auditId: string;
  cycle: number;
  timestamp: number;
  totalAgentsAudited: number;
  behaviorMetrics: BehaviorMetrics;   // network-wide averages
  perAgentMetrics: Map<string, BehaviorMetrics>;
  socialGraph: SocialGraphNode[];
  behavioralFingerprints: BehavioralFingerprint[];
  evolutionValidations: EvolutionValidation[];
  anomalyFlags: AnomalyFlag[];
  networkHealthScore: number;          // 0–100: overall civilization health
}

// ═══════════════════════════════════════════════════════════════
// LAYER 3: CONSENSUS PROOF LAYER
// ═══════════════════════════════════════════════════════════════

export interface ValidatorIdentity {
  validatorId: string;
  validatorName: string;
  stake: number;
  reputation: number;
  specialization: string;
  isActive: boolean;
}

export interface ValidatorContribution {
  validatorId: string;
  witnessCoverage: number;   // 0–1: % of agents witnessed
  auditDepth: number;        // 0–1: audit thoroughness
  anomaliesFound: number;
  consensusAgreement: number; // 0–1: agreement with other validators
  reputationWeight: number;   // stake × reputation
}

export interface ConsensusState {
  consensusId: string;
  cycle: number;
  participatingValidators: number;
  requiredValidators: number;    // minimum for consensus
  hasConsensus: boolean;
  agreementScore: number;        // 0–1: how much validators agree
  challengeWindow: boolean;      // true if within challenge period
  challengesRaised: number;
}

export interface ValidatorReport {
  reportId: string;
  validatorId: string;
  cycle: number;
  timestamp: number;

  // Layer 1: Simulation proof
  state_proof: {
    state_root_hash: string;
    event_merkle_root: string;
    world_state_hash: string;
    simulation_proof: string;
    witnessedAgents: number;
    deterministicSeed: string;
  };

  // Layer 2: Behavior metrics
  behavior_metrics: BehaviorMetrics;

  // Anomaly flags
  anomaly_flags: AnomalyFlag[];

  // Scoring results
  perAgentScores: Array<{
    agentId: string;
    rawScore: number;
    behaviorScore: number;
    evolutionScore: number;
    combinedScore: number;
  }>;

  // Validator signature
  validator_signature: string;   // HMAC-SHA256 of report content
  reportHash: string;            // SHA-256 of entire report (before signature)
  isValid: boolean;
}

// ═══════════════════════════════════════════════════════════════
// REWARD SYSTEM
// ═══════════════════════════════════════════════════════════════

export interface NodeRewardEntry {
  nodeId: string;          // agentId
  ownerWallet?: string;
  nodeScore: number;       // this node's score
  totalNetworkScore: number;
  sharePercent: number;    // nodeScore / totalNetworkScore
  rewardIXC: number;       // (nodeScore / totalNetworkScore) × 1000
  cappedAt1000: boolean;   // global daily cap enforced
}

export interface RewardDistribution {
  distributionId: string;
  cycle: number;
  timestamp: number;
  totalDailyPool: number;           // always 1000 IXC max
  totalNetworkScore: number;
  eligibleNodes: number;
  entries: NodeRewardEntry[];
  totalDistributed: number;         // ≤ 1000 IXC
  remainingPool: number;
  note: string;                     // "Reward bukan per laporan — berbasis kontribusi relatif"
}

// ═══════════════════════════════════════════════════════════════
// ANTI-MANIPULATION
// ═══════════════════════════════════════════════════════════════

export interface SlashingEvent {
  slashId: string;
  validatorId: string;
  reason: "INVALID_REPORT" | "CONSENSUS_DEVIATION" | "CHALLENGE_LOST";
  stakeSlashed: number;
  reputationPenalty: number;
  timestamp: number;
}

export interface ChallengeRecord {
  challengeId: string;
  reportId: string;
  challengerId: string;    // validator who raised challenge
  targetId: string;        // validator being challenged
  reason: string;
  evidence: Record<string, unknown>;
  status: "PENDING" | "RESOLVED_VALID" | "RESOLVED_INVALID";
  timestamp: number;
  resolvedAt?: number;
}

// ═══════════════════════════════════════════════════════════════
// MULTI-VALIDATOR CONSENSUS RESULT
// ═══════════════════════════════════════════════════════════════

export interface MultiValidatorConsensus {
  consensusId: string;
  cycle: number;
  timestamp: number;
  reports: ValidatorReport[];
  consensus: ConsensusState;
  contributions: ValidatorContribution[];
  finalBehaviorMetrics: BehaviorMetrics;  // weighted average of all validators
  finalAnomalyFlags: AnomalyFlag[];       // union of all anomalies
  finalRewardDistribution: RewardDistribution;
  slashingEvents: SlashingEvent[];
  challenges: ChallengeRecord[];
}
