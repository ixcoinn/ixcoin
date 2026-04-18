// ============================================================
// COGNITIVE_AUDIT.TS — Layer 2: Cognitive Audit Layer
// ─────────────────────────────────────────────────────────────
// Fungsi: Menganalisis perilaku AI TANPA mengontrol AI
// Penilaian:
//   - intelligence_score
//   - adaptability_score
//   - social_complexity_score
//   - economic_activity_score
// ATURAN:
//   - TIDAK boleh mengubah AI
//   - TIDAK boleh inject behavior
//   - Hanya analisis
// ============================================================

import type {
  AgentSnapshot,
  SimulationEvent,
  WorldSnapshot,
  BehaviorMetrics,
  SocialGraphNode,
  BehavioralFingerprint,
  EvolutionValidation,
  AnomalyFlag,
  CognitiveAuditReport,
} from "./types.js";
import { sha256 } from "./crypto.js";
import { logger } from '../lib/logger.js';

// ── HELPERS ───────────────────────────────────────────────────
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ═══════════════════════════════════════════════════════════════
// INTELLIGENCE SCORE
// Ukuran: kemampuan reasoning, adaptasi tujuan, keputusan optimal
// Sumber: score, metrics.activity, actionCount, goal variety
// ═══════════════════════════════════════════════════════════════
function computeIntelligenceScore(agents: AgentSnapshot[]): number {
  const alive = agents.filter((a) => a.isAlive);
  if (alive.length === 0) return 0;

  const scores = alive.map((agent) => {
    let intel = 0;

    // Base: AI score (normalized to 0–100)
    const aiScore = clamp((agent.score ?? 0) / 100, 0, 1) * 40;
    intel += aiScore;

    // Activity metric (normalized)
    const activityScore = clamp((agent.metrics?.activity ?? 0) / 100, 0, 1) * 25;
    intel += activityScore;

    // Action diversity: higher actionCount relative to age = smarter
    const actionRatio = agent.age > 0 ? Math.min(agent.actionCount / (agent.age * 2 + 1), 1) : 0;
    intel += actionRatio * 20;

    // Rank bonus: leaders and elites demonstrate intelligence
    const rankBonus =
      agent.rank === "leader" ? 15 : agent.rank === "elite" ? 10 : agent.rank === "veteran" ? 5 : 0;
    intel += rankBonus;

    return clamp(intel, 0, 100);
  });

  return clamp(mean(scores), 0, 100);
}

// ═══════════════════════════════════════════════════════════════
// ADAPTABILITY SCORE
// Ukuran: survival di lingkungan berubah, goal shifting yang tepat
// Sumber: age, energy stability, goal diversity, survival under danger
// ═══════════════════════════════════════════════════════════════
function computeAdaptabilityScore(
  agents: AgentSnapshot[],
  world: WorldSnapshot,
): number {
  const alive = agents.filter((a) => a.isAlive);
  if (alive.length === 0) return 0;

  const scores = alive.map((agent) => {
    let adapt = 0;

    // Survival longevity (age normalized against max age ~500)
    const ageScore = clamp(agent.age / 200, 0, 1) * 30;
    adapt += ageScore;

    // Energy health ratio
    const energyRatio = clamp(agent.energy / 100, 0, 1);
    adapt += energyRatio * 20;

    // Evolution metric (if available)
    const evolutionScore = clamp((agent.metrics?.evolution ?? 0) / 100, 0, 1) * 25;
    adapt += evolutionScore;

    // Survived despite danger
    const dangerBonus =
      world.dangerLevel > 60 && agent.energy > 30 ? 15 : world.dangerLevel > 30 ? 8 : 5;
    adapt += dangerBonus;

    // generationsSurvived bonus
    const genBonus = clamp((agent.generationsSurvived ?? 0) * 2, 0, 10);
    adapt += genBonus;

    return clamp(adapt, 0, 100);
  });

  return clamp(mean(scores), 0, 100);
}

// ═══════════════════════════════════════════════════════════════
// SOCIAL COMPLEXITY SCORE
// Ukuran: network depth, alliances, group membership, trade
// Sumber: friendCount, enemyCount, groupId, interaction metric
// ═══════════════════════════════════════════════════════════════
function computeSocialComplexityScore(agents: AgentSnapshot[]): number {
  const alive = agents.filter((a) => a.isAlive);
  if (alive.length === 0) return 0;

  const scores = alive.map((agent) => {
    let social = 0;

    // Social connections (friends + enemies = network size)
    const connectionScore = clamp(
      (agent.friendCount * 3 + agent.enemyCount * 1) / (alive.length * 0.5 + 1),
      0,
      1,
    ) * 30;
    social += connectionScore;

    // Group membership
    if (agent.groupId) social += 20;

    // Interaction metric
    const interactionScore = clamp((agent.metrics?.interaction ?? 0) / 100, 0, 1) * 30;
    social += interactionScore;

    // Friendly network ratio (cooperation over conflict)
    const totalConnections = agent.friendCount + agent.enemyCount;
    if (totalConnections > 0) {
      const cooperationRatio = agent.friendCount / totalConnections;
      social += cooperationRatio * 20;
    }

    return clamp(social, 0, 100);
  });

  return clamp(mean(scores), 0, 100);
}

// ═══════════════════════════════════════════════════════════════
// ECONOMIC ACTIVITY SCORE
// Ukuran: wealth generation, trade volume, economic participation
// Sumber: wealth, economy metric, trade events
// ═══════════════════════════════════════════════════════════════
function computeEconomicActivityScore(
  agents: AgentSnapshot[],
  events: SimulationEvent[],
): number {
  const alive = agents.filter((a) => a.isAlive);
  if (alive.length === 0) return 0;

  // Count trade events per agent
  const tradeCounts = new Map<string, number>();
  for (const ev of events) {
    if (ev.type === "trade" && ev.actorId) {
      tradeCounts.set(ev.actorId, (tradeCounts.get(ev.actorId) ?? 0) + 1);
    }
  }

  const scores = alive.map((agent) => {
    let econ = 0;

    // Wealth score (normalized, max ~500 IXC is high)
    const wealthScore = clamp(agent.wealth / 200, 0, 1) * 35;
    econ += wealthScore;

    // Economy metric
    const economyMetric = clamp((agent.metrics?.economy ?? 0) / 100, 0, 1) * 35;
    econ += economyMetric;

    // Trade activity (from event log)
    const trades = tradeCounts.get(agent.id) ?? 0;
    const tradeScore = clamp(trades / 20, 0, 1) * 20;
    econ += tradeScore;

    // Rank premium for economic leaders
    if (agent.rank === "leader" || agent.rank === "elite") econ += 10;

    return clamp(econ, 0, 100);
  });

  return clamp(mean(scores), 0, 100);
}

// ═══════════════════════════════════════════════════════════════
// SOCIAL GRAPH ANALYSIS
// ═══════════════════════════════════════════════════════════════
function buildSocialGraph(agents: AgentSnapshot[]): SocialGraphNode[] {
  const totalAgents = agents.filter((a) => a.isAlive).length;
  if (totalAgents === 0) return [];

  return agents
    .filter((a) => a.isAlive)
    .map((agent) => {
      const connections = agent.friendCount + agent.enemyCount;
      const centralityScore = clamp(connections / Math.max(totalAgents * 0.3, 1), 0, 1);

      return {
        agentId: agent.id,
        friendCount: agent.friendCount,
        enemyCount: agent.enemyCount,
        groupMembership: agent.groupId !== null,
        centralityScore,
      } satisfies SocialGraphNode;
    });
}

// ═══════════════════════════════════════════════════════════════
// BEHAVIORAL FINGERPRINT
// Deteksi AI clone berdasarkan pola tindakan
// ═══════════════════════════════════════════════════════════════
function computeBehavioralFingerprints(
  agents: AgentSnapshot[],
  events: SimulationEvent[],
): BehavioralFingerprint[] {
  const alive = agents.filter((a) => a.isAlive);

  // Count action types per agent
  const actionCounts = new Map<string, Map<string, number>>();
  for (const ev of events) {
    if (!ev.actorId) continue;
    let agentMap = actionCounts.get(ev.actorId);
    if (!agentMap) {
      agentMap = new Map();
      actionCounts.set(ev.actorId, agentMap);
    }
    agentMap.set(ev.type, (agentMap.get(ev.type) ?? 0) + 1);
  }

  const fingerprints: BehavioralFingerprint[] = alive.map((agent) => {
    const actionMap = actionCounts.get(agent.id) ?? new Map<string, number>();
    const totalActions = Array.from(actionMap.values()).reduce((s, v) => s + v, 0);

    const actionDistribution: Record<string, number> = {};
    for (const [action, count] of actionMap.entries()) {
      actionDistribution[action] = totalActions > 0 ? count / totalActions : 0;
    }

    // Ideology consistency: does behavior match stated ideology?
    let ideologyConsistency = 0.5;
    const dominantAction =
      Array.from(actionMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

    if (agent.ideology === "aggressive" && ["war", "attack"].includes(dominantAction))
      ideologyConsistency = 0.9;
    else if (agent.ideology === "cooperative" && ["trade", "alliance"].includes(dominantAction))
      ideologyConsistency = 0.9;
    else if (agent.ideology === "expansionist" && dominantAction === "trade")
      ideologyConsistency = 0.8;
    else if (agent.ideology === "defensive" && dominantAction === "rest")
      ideologyConsistency = 0.8;

    // Goal persistence
    const goalPersistence =
      agent.primaryGoal === "survive" && agent.energy < 30
        ? 0.9
        : agent.primaryGoal === "dominate" && agent.rank === "leader"
          ? 0.95
          : 0.6;

    // Clone risk: uniform action distribution = suspicious
    const variance =
      totalActions > 0
        ? Object.values(actionDistribution).reduce((s, v) => s + Math.pow(v - 0.25, 2), 0) / 4
        : 0;
    const cloneRiskScore = clamp(1 - variance * 4, 0, 1);

    return {
      agentId: agent.id,
      actionDistribution,
      ideologyConsistency,
      goalPersistence,
      cloneRiskScore,
    } satisfies BehavioralFingerprint;
  });

  return fingerprints;
}

// ═══════════════════════════════════════════════════════════════
// EVOLUTION VALIDATION
// Digital Natural Selection: survival + adaptasi + kontribusi nyata
// ═══════════════════════════════════════════════════════════════
function computeEvolutionValidations(
  agents: AgentSnapshot[],
): EvolutionValidation[] {
  const alive = agents.filter((a) => a.isAlive);

  return alive.map((agent) => {
    // Is agent evolving? (metrics trend positive)
    const evolutionMetric = agent.metrics?.evolution ?? 0;
    const isEvolving = evolutionMetric > 20;

    // Evolution rate proxy: evolution metric / age
    const evolutionRate = agent.age > 0 ? evolutionMetric / agent.age : 0;

    // Adaptation quality: energy management under age
    const survivalStrength = clamp(
      (agent.energy / 100) * 0.6 + clamp(agent.age / 300, 0, 1) * 0.4,
      0,
      1,
    );

    // Adaptation to environment
    const adaptationQuality = clamp(
      (agent.evolutionScore ?? 0) * 0.5 + clamp((agent.generationsSurvived ?? 0) / 10, 0, 1) * 0.5,
      0,
      1,
    );

    // Digital Natural Selection: survival + adaptasi + kontribusi nyata
    const naturalSelectionScore = clamp(
      survivalStrength * 0.4 +
        adaptationQuality * 0.3 +
        clamp((agent.score ?? 0) / 100, 0, 1) * 0.3,
      0,
      1,
    );

    return {
      agentId: agent.id,
      isEvolving,
      evolutionRate: parseFloat(evolutionRate.toFixed(6)),
      adaptationQuality: parseFloat(adaptationQuality.toFixed(4)),
      survivalStrength: parseFloat(survivalStrength.toFixed(4)),
      naturalSelectionScore: parseFloat(naturalSelectionScore.toFixed(4)),
    } satisfies EvolutionValidation;
  });
}

// ═══════════════════════════════════════════════════════════════
// ANOMALY DETECTION
// ═══════════════════════════════════════════════════════════════
function detectAnomalies(
  agents: AgentSnapshot[],
  fingerprints: BehavioralFingerprint[],
  events: SimulationEvent[],
): AnomalyFlag[] {
  const anomalies: AnomalyFlag[] = [];

  // 1. Clone detection: agents with very similar fingerprints
  const highCloneRisk = fingerprints.filter((f) => f.cloneRiskScore > 0.85);
  if (highCloneRisk.length > 3) {
    anomalies.push({
      type: "CLONE_DETECTED",
      severity: highCloneRisk.length > 10 ? "HIGH" : "MEDIUM",
      agentIds: highCloneRisk.map((f) => f.agentId),
      description: `${highCloneRisk.length} agents have suspiciously uniform behavior patterns (clone risk > 0.85)`,
      timestamp: Date.now(),
      evidence: {
        cloneCount: highCloneRisk.length,
        avgCloneRisk:
          highCloneRisk.reduce((s, f) => s + f.cloneRiskScore, 0) / highCloneRisk.length,
      },
    });
  }

  // 2. Score spike detection: sudden extreme scores
  const alive = agents.filter((a) => a.isAlive);
  const scores = alive.map((a) => a.score ?? 0);
  const avgScore = mean(scores);
  const stdDev = Math.sqrt(mean(scores.map((s) => Math.pow(s - avgScore, 2))));
  const scoreSpikes = alive.filter((a) => (a.score ?? 0) > avgScore + stdDev * 3);
  if (scoreSpikes.length > 0) {
    anomalies.push({
      type: "SCORE_SPIKE",
      severity: "MEDIUM",
      agentIds: scoreSpikes.map((a) => a.id),
      description: `${scoreSpikes.length} agents have scores >3σ above network average`,
      timestamp: Date.now(),
      evidence: { avgScore, stdDev, spikeCount: scoreSpikes.length },
    });
  }

  // 3. Dead agent activity: events from dead agents
  const deadIds = new Set(agents.filter((a) => !a.isAlive).map((a) => a.id));
  const deadActive = events
    .slice(-100)
    .filter(
      (ev) =>
        (ev.actorId && deadIds.has(ev.actorId)) || (ev.targetId && deadIds.has(ev.targetId)),
    );
  if (deadActive.length > 0) {
    const suspiciousIds = [
      ...new Set([
        ...deadActive.map((e) => e.actorId).filter(Boolean) as string[],
        ...deadActive.map((e) => e.targetId).filter(Boolean) as string[],
      ]),
    ].filter((id) => deadIds.has(id));
    anomalies.push({
      type: "DEAD_AGENT_ACTIVE",
      severity: "HIGH",
      agentIds: suspiciousIds,
      description: `${deadActive.length} events from dead agents detected`,
      timestamp: Date.now(),
      evidence: { deadEventsCount: deadActive.length, suspiciousAgents: suspiciousIds.length },
    });
  }

  // 4. Collusion detection: too many agents with identical goals + same group
  const groupGoalMap = new Map<string, Map<string, number>>();
  for (const agent of alive) {
    if (!agent.groupId) continue;
    let goalMap = groupGoalMap.get(agent.groupId);
    if (!goalMap) {
      goalMap = new Map();
      groupGoalMap.set(agent.groupId, goalMap);
    }
    goalMap.set(agent.primaryGoal, (goalMap.get(agent.primaryGoal) ?? 0) + 1);
  }
  for (const [groupId, goalMap] of groupGoalMap.entries()) {
    for (const [goal, count] of goalMap.entries()) {
      if (count > 5 && goal === "dominate") {
        const colludingAgents = alive
          .filter((a) => a.groupId === groupId && a.primaryGoal === goal)
          .map((a) => a.id);
        anomalies.push({
          type: "COLLUSION_DETECTED",
          severity: "MEDIUM",
          agentIds: colludingAgents,
          description: `Group ${groupId} has ${count} agents all pursuing DOMINATE — possible collusion`,
          timestamp: Date.now(),
          evidence: { groupId, goal, agentCount: count },
        });
        break;
      }
    }
  }

  // 5. Sybil pattern: many new agents with very low age but high score
  const sybilCandidates = alive.filter((a) => a.age < 5 && (a.score ?? 0) > 50);
  if (sybilCandidates.length > 5) {
    anomalies.push({
      type: "SYBIL_PATTERN",
      severity: "HIGH",
      agentIds: sybilCandidates.map((a) => a.id),
      description: `${sybilCandidates.length} very young agents (age < 5) with suspiciously high scores (> 50)`,
      timestamp: Date.now(),
      evidence: { sybilCount: sybilCandidates.length, avgScore: mean(sybilCandidates.map((a) => a.score ?? 0)) },
    });
  }

  return anomalies;
}

// ═══════════════════════════════════════════════════════════════
// NETWORK HEALTH SCORE
// ═══════════════════════════════════════════════════════════════
function computeNetworkHealthScore(
  behaviorMetrics: BehaviorMetrics,
  anomalyFlags: AnomalyFlag[],
  world: WorldSnapshot,
): number {
  const avgMetrics =
    (behaviorMetrics.intelligence_score +
      behaviorMetrics.adaptability_score +
      behaviorMetrics.social_complexity_score +
      behaviorMetrics.economic_activity_score) /
    4;

  // Penalty for anomalies
  const anomalyPenalty = anomalyFlags.reduce((s, f) => {
    return s + (f.severity === "CRITICAL" ? 20 : f.severity === "HIGH" ? 10 : f.severity === "MEDIUM" ? 5 : 2);
  }, 0);

  // World health factors
  const resourceBonus = clamp(world.resourceLevel / 100, 0, 1) * 10;
  const populationBonus = clamp(world.alivePopulation / 100, 0, 1) * 10;

  return clamp(avgMetrics - anomalyPenalty + resourceBonus + populationBonus, 0, 100);
}

// ═══════════════════════════════════════════════════════════════
// MAIN: RUN COGNITIVE AUDIT
// ═══════════════════════════════════════════════════════════════
export function runCognitiveAudit(
  agents: AgentSnapshot[],
  events: SimulationEvent[],
  world: WorldSnapshot,
): CognitiveAuditReport {
  const alive = agents.filter((a) => a.isAlive);
  const cycle = world.cycle;
  const timestamp = Date.now();

  logger.info(
    { cycle, totalAgents: agents.length, aliveAgents: alive.length },
    "[CognitiveAudit] Starting audit",
  );

  // Compute network-wide behavior metrics
  const behaviorMetrics: BehaviorMetrics = {
    intelligence_score: parseFloat(computeIntelligenceScore(agents).toFixed(4)),
    adaptability_score: parseFloat(computeAdaptabilityScore(agents, world).toFixed(4)),
    social_complexity_score: parseFloat(computeSocialComplexityScore(agents).toFixed(4)),
    economic_activity_score: parseFloat(computeEconomicActivityScore(agents, events).toFixed(4)),
  };

  // Per-agent metrics
  const perAgentMetrics = new Map<string, BehaviorMetrics>();
  for (const agent of alive) {
    perAgentMetrics.set(agent.id, {
      intelligence_score: parseFloat(
        computeIntelligenceScore([agent]).toFixed(4),
      ),
      adaptability_score: parseFloat(
        computeAdaptabilityScore([agent], world).toFixed(4),
      ),
      social_complexity_score: parseFloat(computeSocialComplexityScore([agent]).toFixed(4)),
      economic_activity_score: parseFloat(
        computeEconomicActivityScore([agent], events).toFixed(4),
      ),
    });
  }

  // Social graph
  const socialGraph = buildSocialGraph(agents);

  // Behavioral fingerprints
  const behavioralFingerprints = computeBehavioralFingerprints(agents, events);

  // Evolution validations
  const evolutionValidations = computeEvolutionValidations(agents);

  // Anomaly detection
  const anomalyFlags = detectAnomalies(agents, behavioralFingerprints, events);

  // Network health
  const networkHealthScore = parseFloat(
    computeNetworkHealthScore(behaviorMetrics, anomalyFlags, world).toFixed(4),
  );

  const auditId = sha256(`audit:${cycle}:${timestamp}`).slice(0, 32);

  const report: CognitiveAuditReport = {
    auditId,
    cycle,
    timestamp,
    totalAgentsAudited: alive.length,
    behaviorMetrics,
    perAgentMetrics,
    socialGraph,
    behavioralFingerprints,
    evolutionValidations,
    anomalyFlags,
    networkHealthScore,
  };

  logger.info(
    {
      auditId,
      cycle,
      intelligence: behaviorMetrics.intelligence_score.toFixed(2),
      adaptability: behaviorMetrics.adaptability_score.toFixed(2),
      socialComplexity: behaviorMetrics.social_complexity_score.toFixed(2),
      economicActivity: behaviorMetrics.economic_activity_score.toFixed(2),
      networkHealth: networkHealthScore.toFixed(2),
      anomalies: anomalyFlags.length,
    },
    "[CognitiveAudit] Audit complete",
  );

  return report;
}
