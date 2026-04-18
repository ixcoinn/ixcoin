// ============================================================
// REPUTATION_ENGINE.TS — [NEW] Sistem Reputasi Node
// Hitung: akurasi validasi, konsistensi, kontribusi task
// Gunakan untuk: bobot voting, trust node
// ============================================================

import { addContribution, getLocalState, updateLocalReputation } from "../p2p/local_state.js";
import { nodeRegistry } from "../p2p/node_registry.js";
import { broadcast, NODE_ID } from "../p2p/p2p_network.js";

export interface ReputationScore {
  nodeId:             string;
  validationAccuracy: number;  // % vote yang benar
  nodeConsistency:    number;  // % waktu node aktif
  taskContribution:   number;  // skor dari jumlah task selesai
  totalScore:         number;  // 0-100
  rank: "TRUSTED" | "GOOD" | "NEUTRAL" | "SUSPICIOUS" | "UNKNOWN";
}

const reputationCache = new Map<string, ReputationScore>();

export function calculateReputation(nodeId: string): ReputationScore {
  const baseRep = nodeRegistry.getReputation(nodeId);
  const state   = getLocalState();
  const isLocal = nodeId === NODE_ID;

  const contributions = isLocal ? state.contribution_history : [];
  const taskCount      = contributions.filter(c => c.type === "task_completed").length;
  const validCount     = contributions.filter(c => c.type === "task_validated").length;
  const consensusCount = contributions.filter(c => c.type === "consensus_participated").length;

  const validationAccuracy = validCount > 0 ? Math.min(100, validCount * 2) : baseRep * 0.5;
  const nodeConsistency    = Math.min(100, consensusCount * 5 + baseRep * 0.3);
  const taskContribution   = Math.min(100, taskCount * 3 +
    contributions.reduce((s, c) => s + c.score, 0) * 0.5);

  const totalScore = validationAccuracy * 0.4 + nodeConsistency * 0.3 + taskContribution * 0.3;

  const rank: ReputationScore["rank"] =
    totalScore >= 80 ? "TRUSTED" :
    totalScore >= 60 ? "GOOD" :
    totalScore >= 40 ? "NEUTRAL" :
    totalScore >= 20 ? "SUSPICIOUS" : "UNKNOWN";

  const result: ReputationScore = {
    nodeId, validationAccuracy, nodeConsistency, taskContribution, totalScore, rank,
  };
  reputationCache.set(nodeId, result);
  return result;
}

// Bobot voting berdasarkan reputasi (0.1 – 2.0)
export function getVotingWeight(nodeId: string): number {
  const rep = calculateReputation(nodeId);
  return Math.max(0.1, Math.min(2.0, rep.totalScore / 50));
}

export function recordValidationContribution(taskId: string, correct: boolean): void {
  addContribution({ timestamp: Date.now(), type: "task_validated", taskId, score: correct ? 2 : -1 });
  updateLocalReputation(correct ? 2 : -2);
  _broadcastReputationUpdate();
}

export function recordTaskCompletion(taskId: string, quality: number): void {
  addContribution({ timestamp: Date.now(), type: "task_completed", taskId, score: quality });
  updateLocalReputation(Math.round(quality));
  _broadcastReputationUpdate();
}

export function recordConsensusParticipation(): void {
  addContribution({ timestamp: Date.now(), type: "consensus_participated", score: 1 });
  updateLocalReputation(1);
}

function _broadcastReputationUpdate(): void {
  const state = getLocalState();
  broadcast({
    type: "REPUTATION_UPDATE",
    from: NODE_ID,
    payload: { nodeId: NODE_ID, reputation: state.reputation },
    timestamp: Date.now(),
  });
}

export function getAllReputations(): ReputationScore[] {
  return nodeRegistry.getAllNodes().map(n => calculateReputation(n.nodeId));
}

export function getTopNodes(limit = 10): ReputationScore[] {
  return getAllReputations().sort((a, b) => b.totalScore - a.totalScore).slice(0, limit);
}
