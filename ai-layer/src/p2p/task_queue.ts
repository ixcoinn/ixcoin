// ============================================================
// TASK_QUEUE.TS — Distributed AI Task Queue
// UPGRADE: Pull model (node pilih sendiri), priority, anti-duplicate, TTL
// Task dibuat → broadcast → AI_NODE ambil sendiri → hasil dikirim balik
// ============================================================

import type { AITask } from "./types.js";
import { broadcast, receiveMessage, NODE_ID } from "./p2p_network.js";
import { logger } from "../lib/logger.js";

const tasks = new Map<string, AITask>();
const executingTasks = new Set<string>(); // [NEW] anti-duplicate execution
const TASK_TTL_MS = 10 * 60 * 1000;      // [NEW] 10 menit TTL

export function createTask(
  type: AITask["type"],
  payload: Record<string, unknown>,
  priority = 5,              // [NEW] default priority 5 dari skala 1-10
): AITask {
  const task: AITask = {
    taskId: "task_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    type,
    payload,
    priority,                // [NEW]
    createdBy: NODE_ID,
    createdAt: Date.now(),
    expiresAt: Date.now() + TASK_TTL_MS,  // [NEW]
    status: "PENDING",
    votes: [],
  };
  tasks.set(task.taskId, task);
  broadcast({ type: "TASK_BROADCAST", from: NODE_ID, payload: { task }, timestamp: Date.now() });
  logger.info({ taskId: task.taskId, type, priority }, "[TaskQueue] Task broadcast");
  return task;
}

// [NEW] Pull model — node memilih task sendiri berdasarkan priority
export function pullTask(): AITask | null {
  const now = Date.now();
  const pending = Array.from(tasks.values())
    .filter(t =>
      t.status === "PENDING" &&
      !executingTasks.has(t.taskId) &&
      t.expiresAt > now,
    )
    .sort((a, b) => b.priority - a.priority); // makin tinggi priority, diambil duluan

  if (pending.length === 0) return null;
  const task = pending[0]!;
  executingTasks.add(task.taskId);
  task.status = "PROCESSING";
  task.assignedTo = NODE_ID;
  broadcast({ type: "TASK_ACCEPT", from: NODE_ID, payload: { taskId: task.taskId }, timestamp: Date.now() });
  return task;
}

export function acceptTask(taskId: string): AITask | null {
  const task = tasks.get(taskId);
  if (!task || task.status !== "PENDING") return null;
  task.status = "PROCESSING";
  task.assignedTo = NODE_ID;
  executingTasks.add(taskId);
  broadcast({ type: "TASK_ACCEPT", from: NODE_ID, payload: { taskId }, timestamp: Date.now() });
  return task;
}

export function submitTaskResult(taskId: string, result: Record<string, unknown>): void {
  const task = tasks.get(taskId);
  if (!task) return;
  task.status = "COMPLETED";
  task.result = result;
  executingTasks.delete(taskId);
  broadcast({ type: "TASK_RESULT", from: NODE_ID, payload: { taskId, result }, timestamp: Date.now() });
  logger.info({ taskId }, "[TaskQueue] Result submitted");
}

// [NEW] Auto-generate task oleh AI sendiri
export function generateTask(): AITask {
  const types: AITask["type"][] = ["TX_VALIDATE", "AI_INFERENCE", "CONSENSUS", "MEMPOOL_SCAN", "GENERATE", "PROCESS"];
  const type = types[Math.floor(Math.random() * types.length)]!;
  const priority = Math.floor(Math.random() * 10) + 1;
  return createTask(type, { auto: true, cycle: Date.now() }, priority);
}

export function initTaskQueueHandlers(): void {
  receiveMessage((msg) => {
    switch (msg.type) {
      case "TASK_BROADCAST": {
        const task = msg.payload["task"] as AITask;
        // [NEW] anti-duplicate — jangan tambah jika sudah ada
        if (!tasks.has(task.taskId)) {
          tasks.set(task.taskId, { ...task, status: "PENDING" });
        }
        break;
      }
      case "TASK_ACCEPT": {
        const taskId = String(msg.payload["taskId"]);
        const task = tasks.get(taskId);
        // [NEW] hanya update jika msg dari node lain (bukan diri sendiri)
        if (task && task.status === "PENDING" && msg.from !== NODE_ID) {
          task.status = "PROCESSING";
          task.assignedTo = msg.from;
          executingTasks.delete(taskId); // biarkan node lain handle
        }
        break;
      }
      case "TASK_RESULT": {
        const taskId = String(msg.payload["taskId"]);
        const result = msg.payload["result"] as Record<string, unknown>;
        const task = tasks.get(taskId);
        if (task) { task.status = "COMPLETED"; task.result = result; }
        executingTasks.delete(taskId);
        break;
      }
    }
  });

  // [NEW] Cleanup task kadaluarsa
  setInterval(() => {
    const now = Date.now();
    for (const [id, task] of tasks) {
      if (task.expiresAt < now && task.status === "PENDING") {
        task.status = "FAILED";
        executingTasks.delete(id);
      }
    }
  }, 60_000);
}

export function getAllTasks(): AITask[] { return Array.from(tasks.values()); }
export function getPendingTasks(): AITask[] {
  const now = Date.now();
  return Array.from(tasks.values()).filter(t => t.status === "PENDING" && t.expiresAt > now);
}
export function getTaskById(id: string): AITask | undefined { return tasks.get(id); }
