// ============================================================
// VALIDATION_SYSTEM.TS — Distributed Validator Consensus
// UPGRADE: Weighted voting (berdasarkan reputasi), threshold 67%
// VALIDATOR_NODE memverifikasi hasil AI secara quorum-based
// ============================================================

import type { AITask, ValidationVote } from "./types.js";
import { broadcast, receiveMessage, NODE_ID, NODE_TYPE } from "./p2p_network.js";
import { nodeRegistry } from "./node_registry.js";
import { getTaskById, getAllTasks } from "./task_queue.js";
import { logger } from "../lib/logger.js";

// [UPGRADE] Threshold naik dari 51% ke 67% sesuai direktif
const QUORUM_THRESHOLD = 0.67;
const MIN_VALIDATORS   = 3;

// [NEW] Bobot voting berdasarkan reputasi node
function getVoterWeight(nodeId: string): number {
  const reputation = nodeRegistry.getReputation(nodeId) || 0;

  const safeRep = Math.max(0, reputation);
  const weight = Math.log10(safeRep + 1);

  return Math.min(2, Math.max(0.05, weight));
}

export function castVote(taskId: string, approved: boolean, confidence = 0.8): void {

  const weight = getVoterWeight(NODE_ID); // [NEW] weighted
  const vote: ValidationVote = {
    validatorId: NODE_ID,
    approved,
    confidence,
    weight,               // [NEW]
    timestamp: Date.now(),
  };
  broadcast({
    type: "VALIDATION_VOTE", from: NODE_ID,
    payload: { taskId, vote }, timestamp: Date.now(),
  });
  logger.debug({ taskId, approved, weight }, "[Validator] Weighted vote cast");
}

// [UPGRADE] Weighted consensus — bukan simple majority
export function calculateConsensus(task: AITask): "APPROVED" | "REJECTED" | "PENDING" {
  if (!task.votes || task.votes.length < MIN_VALIDATORS) return "PENDING";

  const totalWeight    = task.votes.reduce((sum, v) => sum + (v.weight ?? 1), 0);
  const approvedWeight = task.votes
    .filter(v => v.approved)
    .reduce((sum, v) => sum + (v.weight ?? 1), 0);

  const weightedRatio = totalWeight > 0 ? approvedWeight / totalWeight : 0;
  return weightedRatio >= QUORUM_THRESHOLD ? "APPROVED" : "REJECTED";
}

export function initValidationHandlers(): void {
  receiveMessage((msg) => {
    switch (msg.type) {
      case "TASK_RESULT": {
        const taskId = String(msg.payload["taskId"]);
        const task = getTaskById(taskId);
        if (task && NODE_TYPE === "VALIDATOR_NODE") {
          const result = task.result ?? {};
          const isValid     = result["valid"] !== false;
          const confidence  = typeof result["confidence"] === "number" ? result["confidence"] : 0.9;
          setTimeout(() => castVote(taskId, isValid, confidence), 500);
        }
        break;
      }
      case "VALIDATION_VOTE": {
        const taskId = String(msg.payload["taskId"]);
        const vote   = msg.payload["vote"] as ValidationVote;
        const task   = getTaskById(taskId);
        if (task) {
          if (!task.votes) task.votes = [];
          if (!task.votes.some(v => v.validatorId === vote.validatorId)) {
            task.votes.push(vote);
            const consensus = calculateConsensus(task);
            if (consensus !== "PENDING") {
              task.status = consensus === "APPROVED" ? "CONSENSUS_OK" : "CONSENSUS_FAIL";
              broadcast({
                type: "CONSENSUS_RESULT", from: NODE_ID,
                payload: {
                  taskId,
                  consensus,
                  votes: task.votes.length,
                  threshold: QUORUM_THRESHOLD, // [NEW] eksplisit
                },
                timestamp: Date.now(),
              });
              logger.info({ taskId, consensus }, "[Validator] Weighted consensus reached");
              // [NEW] Update reputasi voter berdasarkan hasil
              for (const v of task.votes) {
  const correct = (v.approved && consensus === "APPROVED") ||
                  (!v.approved && consensus === "REJECTED");

  nodeRegistry.updateReputation(v.validatorId, correct ? 1 : -1);
}
            }
          }
        }
        break;
      }
    }
  });
}

export function getValidationSummary() {
  const tasks = getAllTasks();
  return {
    total:           tasks.length,
    pending:         tasks.filter(t => t.status === "PENDING").length,
    processing:      tasks.filter(t => t.status === "PROCESSING").length,
    completed:       tasks.filter(t => t.status === "COMPLETED").length,
    consensusOk:     tasks.filter(t => t.status === "CONSENSUS_OK").length,
    consensusFail:   tasks.filter(t => t.status === "CONSENSUS_FAIL").length,
    quorumThreshold: QUORUM_THRESHOLD,   // [NEW]
  };
}
