// ============================================================
// CONTRIBUTION_ENGINE.TS — [NEW] Sistem Kontribusi Node
// Hitung: jumlah task selesai, kualitas, partisipasi validasi
// Output: contribution_score + estimasi reward
// ============================================================

import { getLocalState, addContribution } from "../p2p/local_state.js";
import { getAllTasks } from "../p2p/task_queue.js";
import { broadcast, NODE_ID } from "../p2p/p2p_network.js";

export interface ContributionReport {
  nodeId:             string;
  tasksCompleted:     number;
  tasksValidated:     number;
  consensusCount:     number;
  avgQuality:         number;    // 0-10
  contributionScore:  number;    // 0-100
  estimatedReward:    number;    // dalam satuan IXCoin
  period:             string;    // "all_time" | "24h" | "7d"
}

const REWARD_PER_TASK       = 0.5;    // IXC per task selesai
const REWARD_PER_VALIDATION = 0.2;   // IXC per validasi
const REWARD_PER_CONSENSUS  = 0.1;   // IXC per partisipasi consensus

export function getContributionReport(nodeId = NODE_ID, period: "all_time" | "24h" | "7d" = "all_time"): ContributionReport {
  const state = getLocalState();
  const now   = Date.now();
  const cutoff =
    period === "24h" ? now - 86400000 :
    period === "7d"  ? now - 604800000 : 0;

  const history = state.contribution_history.filter(c => c.timestamp >= cutoff);
  const tasksCompleted  = history.filter(c => c.type === "task_completed").length;
  const tasksValidated  = history.filter(c => c.type === "task_validated").length;
  const consensusCount  = history.filter(c => c.type === "consensus_participated").length;

  const qualityScores = history.filter(c => c.type === "task_completed").map(c => c.score);
  const avgQuality    = qualityScores.length > 0
    ? qualityScores.reduce((s, q) => s + q, 0) / qualityScores.length
    : 0;

  const contributionScore = Math.min(100,
    tasksCompleted * 3 + tasksValidated * 2 + consensusCount * 1 + avgQuality * 2,
  );

  const estimatedReward =
    tasksCompleted  * REWARD_PER_TASK +
    tasksValidated  * REWARD_PER_VALIDATION +
    consensusCount  * REWARD_PER_CONSENSUS;

  return {
    nodeId, tasksCompleted, tasksValidated, consensusCount,
    avgQuality, contributionScore, estimatedReward, period,
  };
}

// Rekam penyelesaian task dengan kualitas tertentu
export function recordTaskDone(taskId: string, quality: number): void {
  addContribution({ timestamp: Date.now(), type: "task_completed", taskId, score: quality });
  broadcastContribution();
}

// Rekam partisipasi validasi
export function recordValidation(taskId: string): void {
  addContribution({ timestamp: Date.now(), type: "task_validated", taskId, score: 1 });
}

// Rekam partisipasi consensus
export function recordConsensus(): void {
  addContribution({ timestamp: Date.now(), type: "consensus_participated", score: 1 });
}

function broadcastContribution(): void {
  const report = getContributionReport();
  broadcast({
    type: "CONTRIBUTION_UPDATE",
    from: NODE_ID,
    payload: { nodeId: NODE_ID, contributionScore: report.contributionScore, estimatedReward: report.estimatedReward },
    timestamp: Date.now(),
  });
}

// Semua task yang diselesaikan oleh node ini
export function getMyCompletedTasks() {
  return getAllTasks().filter(t => t.assignedTo === NODE_ID && t.status === "COMPLETED");
}
