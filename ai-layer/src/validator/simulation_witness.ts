// ============================================================
// SIMULATION_WITNESS.TS — Layer 1: Simulation Witness Layer
// ─────────────────────────────────────────────────────────────
// Fungsi:
//   - Ambil snapshot state dunia (±100 AI agents)
//   - Ambil event log (interaksi, trade, konflik, dll)
//   - Buat bukti kriptografis
// Output:
//   - state_root_hash
//   - event_merkle_root
//   - simulation_proof
// ATURAN: Simulasi HARUS deterministic (bisa diulang hasilnya sama)
// ============================================================

import {
  computeStateRootHash,
  computeEventMerkleRoot,
  computeWorldStateHash,
  computeSimulationProof,
  computeDeterministicSeed,
  sha256,
} from "./crypto.js";
import type {
  AgentSnapshot,
  SimulationEvent,
  WorldSnapshot,
  SimulationWitness,
} from "./types.js";
import { logger } from '../lib/logger.js';

// ── MAX AGENTS TO WITNESS ─────────────────────────────────────
const MAX_WITNESS_AGENTS = 100;
const MAX_WITNESS_EVENTS = 200;

let _witnessHistory: SimulationWitness[] = [];
const MAX_HISTORY = 50;

// ── EXTRACT AGENT SNAPSHOTS — deterministic, sorted ──────────
function extractAgentSnapshots(rawAgents: unknown[]): AgentSnapshot[] {
  const snapshots: AgentSnapshot[] = rawAgents
    .filter((a) => {
      const agent = a as Record<string, unknown>;
      return agent && typeof agent === "object";
    })
    .map((a) => {
      const agent = a as Record<string, unknown>;
      const goals = (agent["goals"] as Record<string, unknown>) ?? {};
      const relations = (agent["relations"] as Record<string, unknown>) ?? {};
      const evolution = (agent["evolution"] as Record<string, unknown>) ?? {};
      const metrics = agent["metrics"] as Record<string, number> | undefined;

      return {
        id: String(agent["id"] ?? ""),
        name: String(agent["name"] ?? ""),
        isAlive: Boolean(agent["isAlive"]),
        energy: Number(agent["energy"] ?? 0),
        wealth: Number(agent["wealth"] ?? 0),
        age: Number(agent["age"] ?? 0),
        rank: String(agent["rank"] ?? "citizen"),
        ideology: String(agent["ideology"] ?? "neutral"),
        primaryGoal: String(goals["primaryGoal"] ?? "survive"),
        actionCount: Number(agent["actionCount"] ?? 0),
        groupId: agent["groupId"] ? String(agent["groupId"]) : null,
        friendCount: Array.isArray(relations["friends"]) ? (relations["friends"] as unknown[]).length : 0,
        enemyCount: Array.isArray(relations["enemies"]) ? (relations["enemies"] as unknown[]).length : 0,
        metrics: metrics
          ? {
              activity: Number(metrics["activity"] ?? 0),
              interaction: Number(metrics["interaction"] ?? 0),
              economy: Number(metrics["economy"] ?? 0),
              evolution: Number(metrics["evolution"] ?? 0),
            }
          : undefined,
        score: agent["score"] !== undefined ? Number(agent["score"]) : undefined,
        validationScore:
          agent["validationScore"] !== undefined ? Number(agent["validationScore"]) : undefined,
        finalScore: agent["finalScore"] !== undefined ? Number(agent["finalScore"]) : undefined,
        lastAction: agent["lastAction"] ? String(agent["lastAction"]) : undefined,
        evolutionScore:
          evolution["adaptationScore"] !== undefined
            ? Number(evolution["adaptationScore"])
            : undefined,
        generationsSurvived:
          evolution["generationsSurvived"] !== undefined
            ? Number(evolution["generationsSurvived"])
            : undefined,
      } satisfies AgentSnapshot;
    })
    .sort((a, b) => a.id.localeCompare(b.id)); // deterministic ordering

  // Limit to MAX_WITNESS_AGENTS (alive agents first, sorted by score desc)
  const alive = snapshots.filter((a) => a.isAlive);
  const dead = snapshots.filter((a) => !a.isAlive);
  alive.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return [...alive, ...dead].slice(0, MAX_WITNESS_AGENTS);
}

// ── EXTRACT WORLD SNAPSHOT ────────────────────────────────────
function extractWorldSnapshot(rawWorld: unknown): WorldSnapshot {
  const world = (rawWorld ?? {}) as Record<string, unknown>;
  const stats = (rawWorld as Record<string, unknown> | null) ?? {};

  return {
    cycle: Number(world["cycle"] ?? 0),
    resourceLevel: Number(world["resourceLevel"] ?? 0),
    dangerLevel: Number(world["dangerLevel"] ?? 0),
    activityLevel: Number(world["activityLevel"] ?? 0),
    alivePopulation: Number(world["alivePopulation"] ?? 0),
    totalBirths: Number(world["birthCount"] ?? stats["totalBirths"] ?? 0),
    totalDeaths: Number(stats["totalDeaths"] ?? 0),
    totalInteractions: Number(stats["totalInteractions"] ?? 0),
    tradeVolume: Number(world["tradeVolume"] ?? 0),
    timestamp: Date.now(),
  };
}

// ── EXTRACT EVENT SAMPLE ──────────────────────────────────────
function extractEventSample(rawEvents: unknown[]): SimulationEvent[] {
  return rawEvents
    .slice(-MAX_WITNESS_EVENTS)
    .map((e) => {
      const ev = e as Record<string, unknown>;
      return {
        id: String(ev["id"] ?? ""),
        type: String(ev["type"] ?? "unknown"),
        actorId: ev["actorId"] ? String(ev["actorId"]) : undefined,
        targetId: ev["targetId"] ? String(ev["targetId"]) : undefined,
        groupId: ev["groupId"] ? String(ev["groupId"]) : undefined,
        description: String(ev["description"] ?? ""),
        timestamp: Number(ev["timestamp"] ?? 0),
        cycle: Number(ev["cycle"] ?? 0),
      } satisfies SimulationEvent;
    });
}

// ── TAKE SIMULATION SNAPSHOT ──────────────────────────────────
// Main entry point for Layer 1
export function takeSimulationWitness(
  rawAgents: unknown[],
  rawEvents: unknown[],
  rawWorld: unknown,
): SimulationWitness {
  const agentSnapshots = extractAgentSnapshots(rawAgents);
  const eventSample = extractEventSample(rawEvents);
  const worldSnapshot = extractWorldSnapshot(rawWorld);

  const cycle = worldSnapshot.cycle;
  const timestamp = Date.now();

  // Compute cryptographic proofs
  const state_root_hash = computeStateRootHash(agentSnapshots);
  const event_merkle_root = computeEventMerkleRoot(eventSample);
  const world_state_hash = computeWorldStateHash(worldSnapshot);
  const deterministicSeed = computeDeterministicSeed(
    cycle,
    agentSnapshots.length,
    state_root_hash,
  );
  const simulation_proof = computeSimulationProof(
    state_root_hash,
    event_merkle_root,
    world_state_hash,
    cycle,
    timestamp,
    deterministicSeed,
  );

  const witness: SimulationWitness = {
    witnessId: sha256(`witness:${cycle}:${timestamp}:${state_root_hash}`).slice(0, 32),
    cycle,
    timestamp,
    agentCount: agentSnapshots.length,
    aliveCount: agentSnapshots.filter((a) => a.isAlive).length,
    state_root_hash,
    event_merkle_root,
    world_state_hash,
    simulation_proof,
    agentSnapshots,
    eventSample,
    worldSnapshot,
    deterministicSeed,
  };

  // Store in history
  _witnessHistory.push(witness);
  if (_witnessHistory.length > MAX_HISTORY) {
    _witnessHistory = _witnessHistory.slice(-MAX_HISTORY);
  }

  logger.info(
    {
      witnessId: witness.witnessId,
      cycle,
      agentCount: agentSnapshots.length,
      aliveCount: witness.aliveCount,
      state_root_hash: state_root_hash.slice(0, 16) + "...",
      simulation_proof: simulation_proof.slice(0, 16) + "...",
    },
    "[WitnessLayer] Simulation snapshot taken",
  );

  return witness;
}

// ── VERIFY WITNESS — replay proof verification ────────────────
export function verifySimulationWitness(witness: SimulationWitness): boolean {
  try {
    const recomputedStateRoot = computeStateRootHash(witness.agentSnapshots);
    const recomputedEventRoot = computeEventMerkleRoot(witness.eventSample);
    const recomputedWorldHash = computeWorldStateHash(witness.worldSnapshot);
    const recomputedSeed = computeDeterministicSeed(
      witness.cycle,
      witness.agentSnapshots.length,
      recomputedStateRoot,
    );
    const recomputedProof = computeSimulationProof(
      recomputedStateRoot,
      recomputedEventRoot,
      recomputedWorldHash,
      witness.cycle,
      witness.timestamp,
      recomputedSeed,
    );

    const isValid =
      recomputedStateRoot === witness.state_root_hash &&
      recomputedEventRoot === witness.event_merkle_root &&
      recomputedWorldHash === witness.world_state_hash &&
      recomputedProof === witness.simulation_proof;

    return isValid;
  } catch {
    return false;
  }
}

// ── GET WITNESS HISTORY ───────────────────────────────────────
export function getWitnessHistory(): SimulationWitness[] {
  return _witnessHistory;
}

export function getLatestWitness(): SimulationWitness | null {
  return _witnessHistory.length > 0
    ? (_witnessHistory[_witnessHistory.length - 1] ?? null)
    : null;
}
