// ============================================================
// VALIDATOR_ENGINE.TS — Advanced Validator Orchestrator
// ─────────────────────────────────────────────────────────────
// Mengorkestrasi 3 Layer Validator:
//   1. Simulation Witness Layer
//   2. Cognitive Audit Layer
//   3. Consensus Proof Layer
// ─────────────────────────────────────────────────────────────
// ATURAN KERAS:
//   - TIDAK menyentuh PoW Blockchain
//   - TIDAK mengubah AI state
//   - TIDAK menentukan pemenang / distribusi reward langsung
//   - HANYA: verifikasi, analisis, laporan
// ============================================================

import {
  takeSimulationWitness,
  verifySimulationWitness,
  getLatestWitness,
  getWitnessHistory,
} from "./simulation_witness.js";
import { runCognitiveAudit } from "./cognitive_audit.js";
import {
  runMultiValidatorConsensus,
  initConsensusValidators,
  listConsensusValidators,
  registerConsensusValidator,
  getRecentReports,
  getSlashingHistory,
  getChallengeHistory,
  getValidatorStats,
  raiseChallenge,
  resolveChallenge,
} from "./consensus_proof.js";
import type { MultiValidatorConsensus, SimulationWitness } from "./types.js";
import { logger } from '../lib/logger.js';

// ── INIT ──────────────────────────────────────────────────────
let _initialized = false;

export function initValidatorEngine(): void {
  if (_initialized) return;
  initConsensusValidators();
  _initialized = true;
  logger.info("[ValidatorEngine] Advanced Validator System initialized");
  logger.info("[ValidatorEngine] 3 layers active: Witness | CognitiveAudit | ConsensusProof");
}

// ── CYCLE HISTORY ─────────────────────────────────────────────
const _cycleResults: MultiValidatorConsensus[] = [];
const MAX_CYCLE_HISTORY = 30;

// ═══════════════════════════════════════════════════════════════
// MAIN: RUN FULL VALIDATOR CYCLE
// Input: Raw civilization state (passed by reference — read only)
// Output: MultiValidatorConsensus report
// ═══════════════════════════════════════════════════════════════
export function runValidatorCycle(civilizationState: {
  agents: unknown;
  eventLog: unknown[];
  world: unknown;
  stats?: unknown;
}): MultiValidatorConsensus {
  if (!_initialized) initValidatorEngine();

  const { agents, eventLog, world } = civilizationState;

  // Convert agents (Map or Array) to array
  let agentsArray: unknown[];
  if (agents instanceof Map) {
    agentsArray = Array.from(agents.values());
  } else if (Array.isArray(agents)) {
    agentsArray = agents;
  } else {
    agentsArray = [];
  }

  logger.info(
    { agentCount: agentsArray.length, eventCount: eventLog.length },
    "[ValidatorEngine] Running validator cycle",
  );

  // ── LAYER 1: Simulation Witness ───────────────────────────────
  const witness = takeSimulationWitness(agentsArray, eventLog, world);

  // ── LAYER 2: Cognitive Audit ──────────────────────────────────
  const audit = runCognitiveAudit(
    witness.agentSnapshots,
    witness.eventSample,
    witness.worldSnapshot,
  );

  // ── LAYER 3: Consensus Proof ──────────────────────────────────
  const consensus = runMultiValidatorConsensus(witness, audit);

  // Store cycle result
  _cycleResults.push(consensus);
  if (_cycleResults.length > MAX_CYCLE_HISTORY) {
    _cycleResults.splice(0, _cycleResults.length - MAX_CYCLE_HISTORY);
  }

  logger.info(
    {
      consensusId: consensus.consensusId,
      cycle: consensus.cycle,
      validators: consensus.reports.length,
      hasConsensus: consensus.consensus.hasConsensus,
      networkHealth: audit.networkHealthScore.toFixed(2),
      totalReward: consensus.finalRewardDistribution.totalDistributed.toFixed(4),
    },
    "[ValidatorEngine] Validator cycle complete",
  );

  return consensus;
}

// ── RUN FROM MOCK/STANDALONE (no civilization needed) ─────────
export function runStandaloneValidatorCycle(): MultiValidatorConsensus {
  // Generate mock civilization state for testing/standalone operation
  const mockAgents = generateMockAgents(50);
  const mockEvents = generateMockEvents(mockAgents, 100);
  const mockWorld = generateMockWorld();

  return runValidatorCycle({
    agents: mockAgents,
    eventLog: mockEvents,
    world: mockWorld,
  });
}

// ── MOCK DATA GENERATORS (for standalone/testing) ────────────
function generateMockAgents(count: number): unknown[] {
  const ranks = ["citizen", "veteran", "elite", "leader"];
  const ideologies = ["aggressive", "cooperative", "expansionist", "defensive"];
  const goals = ["survive", "grow", "dominate", "cooperate"];

  return Array.from({ length: count }, (_, i) => {
    const age = Math.floor(Math.random() * 200);
    const energy = Math.random() * 100;
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    const score = Math.random() * 80;
    const friendCount = Math.floor(Math.random() * 10);
    const enemyCount = Math.floor(Math.random() * 5);

    return {
      id: `agent_${i.toString().padStart(4, "0")}`,
      name: `AI-${i.toString().padStart(4, "0")}`,
      isAlive: Math.random() > 0.15,
      energy,
      maxEnergy: 100,
      wealth: Math.random() * 200,
      age,
      rank,
      ideology: ideologies[Math.floor(Math.random() * ideologies.length)],
      goals: {
        primaryGoal: goals[Math.floor(Math.random() * goals.length)],
        secondaryGoals: [],
        priorityLevel: Math.floor(Math.random() * 10) + 1,
      },
      actionCount: Math.floor(Math.random() * 500),
      groupId: Math.random() > 0.6 ? `group_${Math.floor(Math.random() * 5)}` : null,
      relations: {
        friends: Array.from({ length: friendCount }, (_, j) => `agent_${j.toString().padStart(4, "0")}`),
        enemies: Array.from({ length: enemyCount }, (_, j) => `agent_${(j + 50).toString().padStart(4, "0")}`),
        alliances: [],
      },
      metrics: {
        activity: Math.random() * 100,
        interaction: Math.random() * 100,
        economy: Math.random() * 100,
        evolution: Math.random() * 100,
      },
      score,
      validationScore: 0.8 + Math.random() * 0.2,
      finalScore: score * (0.8 + Math.random() * 0.2),
      lastAction: ["trade", "explore", "rest", "cooperate", "attack"][
        Math.floor(Math.random() * 5)
      ],
      evolution: {
        adaptationScore: Math.random() * 10,
        generationsSurvived: Math.floor(Math.random() * 10),
        mutationCount: Math.floor(Math.random() * 5),
        lastMutationAt: Date.now() - Math.random() * 100000,
      },
    };
  });
}

function generateMockEvents(agents: unknown[], count: number) {
  const types = ["trade", "war", "alliance", "birth", "death", "mutation", "rank_change"];
  const agentsArr = agents as Array<{ id: string }>;

  return Array.from({ length: count }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)]!;
    const actor = agentsArr[Math.floor(Math.random() * agentsArr.length)];
    const target = agentsArr[Math.floor(Math.random() * agentsArr.length)];

    return {
      id: `evt_${i.toString().padStart(6, "0")}`,
      type,
      actorId: actor?.id,
      targetId: target?.id !== actor?.id ? target?.id : undefined,
      description: `${type} event involving ${actor?.id ?? "unknown"}`,
      timestamp: Date.now() - Math.random() * 10000,
      cycle: Math.floor(Math.random() * 1000),
    };
  });
}

function generateMockWorld() {
  return {
    cycle: Math.floor(Math.random() * 1000) + 100,
    resourceLevel: 40 + Math.random() * 50,
    dangerLevel: Math.random() * 60,
    activityLevel: 30 + Math.random() * 60,
    alivePopulation: Math.floor(Math.random() * 50) + 30,
    birthCount: Math.floor(Math.random() * 200),
    alivePopulationPeak: 100,
    tradeVolume: Math.random() * 5000,
  };
}

// ── QUERY API ─────────────────────────────────────────────────

export function getLatestCycleResult(): MultiValidatorConsensus | null {
  return _cycleResults.length > 0
    ? (_cycleResults[_cycleResults.length - 1] ?? null)
    : null;
}

export function getCycleHistory(): MultiValidatorConsensus[] {
  return _cycleResults;
}

export function getValidatorSystemStatus() {
  const latest = getLatestCycleResult();
  const stats = getValidatorStats();

  return {
    initialized: _initialized,
    validators: listConsensusValidators(),
    stats,
    latestCycle: latest
      ? {
          consensusId: latest.consensusId,
          cycle: latest.cycle,
          timestamp: latest.timestamp,
          hasConsensus: latest.consensus.hasConsensus,
          agreementScore: latest.consensus.agreementScore,
          participatingValidators: latest.consensus.participatingValidators,
          networkScore: latest.finalBehaviorMetrics,
          anomalies: latest.finalAnomalyFlags.length,
          totalReward: latest.finalRewardDistribution.totalDistributed,
        }
      : null,
    witnessHistory: getWitnessHistory().slice(-5).map((w: SimulationWitness) => ({
      witnessId: w.witnessId,
      cycle: w.cycle,
      aliveCount: w.aliveCount,
      state_root_hash: w.state_root_hash,
    })),
  };
}

export {
  // Re-export key functions
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
};
