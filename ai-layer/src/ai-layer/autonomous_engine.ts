// ============================================================
// AUTONOMOUS_ENGINE.TS — [NEW] Self-Running Decentralized AI
// Observe → Think → Act → Broadcast (tanpa request eksternal)
// Tidak ada master node, tidak ada central scheduler
// ============================================================

import { logger } from "../lib/logger.js";
import { broadcast, receiveMessage, NODE_ID, NODE_TYPE } from "../p2p/p2p_network.js";
import { generateTask, pullTask, submitTaskResult, getPendingTasks } from "../p2p/task_queue.js";
import { getValidationSummary } from "../p2p/validation_system.js";
import { loadLocalState, updateAIMemory, updateAIState, getStateSnapshot } from "../p2p/local_state.js";
import { recordTaskDone, recordConsensus } from "./contribution_engine.js";
import { recordTaskCompletion, recordConsensusParticipation } from "./reputation_engine.js";

const OBSERVE_INTERVAL_MS = 5000;   // Observe setiap 5 detik
const THINK_INTERVAL_MS   = 8000;   // Think setiap 8 detik
const ACT_INTERVAL_MS     = 12000;  // Act setiap 12 detik
const GEN_TASK_INTERVAL   = 30000;  // Generate task baru setiap 30 detik

let _running = false;
const _state = { cycle: 0, lastObserve: 0, lastThink: 0, lastAct: 0 };

// ── OBSERVE — Kumpulkan data dari jaringan ──────────────────
function observe(): Record<string, unknown> {
  const localState  = getStateSnapshot();
  const pendingTasks = getPendingTasks();
  const validation  = getValidationSummary();
  const observation = {
    cycle:        _state.cycle,
    nodeId:       NODE_ID,
    nodeType:     NODE_TYPE,
    timestamp:    Date.now(),
    localState,
    pendingTasks: pendingTasks.length,
    validation,
  };
  updateAIMemory("last_observation", observation);
  logger.debug({ cycle: _state.cycle, pendingTasks: pendingTasks.length }, "[AutoEngine] Observe");
  return observation;
}

// ── THINK — Putuskan aksi berdasarkan observasi ──────────────
function think(observation: Record<string, unknown>): { action: string; reasoning: string } {
  const pending = Number(observation["pendingTasks"] ?? 0);
  const rep     = (observation["localState"] as Record<string, unknown>)?.["reputation"] as number ?? 50;

  let action    = "IDLE";
  let reasoning = "nothing to do";

  if (pending > 10) {
    action    = "PROCESS_TASK";
    reasoning = `${pending} tasks pending — pull and process`;
  } else if (pending > 0) {
    action    = "PROCESS_TASK";
    reasoning = `${pending} task(s) available`;
  } else if (rep < 30) {
    action    = "GENERATE_TASK";
    reasoning = "low reputation — generate contribution task";
  } else {
    action    = "GENERATE_TASK";
    reasoning = "network idle — generate new task to stimulate network";
  }

  updateAIState("last_decision", { action, reasoning, cycle: _state.cycle });
  return { action, reasoning };
}

// ── ACT — Eksekusi keputusan dan broadcast hasilnya ──────────
async function act(decision: { action: string; reasoning: string }): Promise<void> {
  try {
    switch (decision.action) {
      case "PROCESS_TASK": {
        const task = pullTask();
        if (!task) return;
        logger.info({ taskId: task.taskId, type: task.type }, "[AutoEngine] Processing task");

        // Simulate processing
        await new Promise(r => setTimeout(r, 200 + Math.random() * 500));
        const quality = 5 + Math.random() * 5;
        const result  = { valid: true, confidence: quality / 10, processedBy: NODE_ID, cycle: _state.cycle };

        submitTaskResult(task.taskId, result);
        recordTaskDone(task.taskId, quality);
        recordTaskCompletion(task.taskId, quality);

        broadcast({
          type: "BLOCKCHAIN_RESULT",
          from: NODE_ID,
          payload: { taskId: task.taskId, result, forBlockchain: true },
          timestamp: Date.now(),
        });
        break;
      }
      case "GENERATE_TASK": {
        const task = generateTask();
        logger.info({ taskId: task.taskId }, "[AutoEngine] Generated new task");
        break;
      }
      case "IDLE":
      default: {
        // Broadcast heartbeat saja
        broadcast({
          type: "HEARTBEAT",
          from: NODE_ID,
          payload: { idle: true, cycle: _state.cycle, state: getStateSnapshot() },
          timestamp: Date.now(),
        });
        break;
      }
    }
  } catch (err) {
    logger.warn({ err }, "[AutoEngine] Act error");
  }
}

// ── MAIN AUTONOMOUS LOOP ────────────────────────────────────
async function autonomousLoop(): Promise<void> {
  if (!_running) return;
  _state.cycle++;
  const now = Date.now();

  try {
    // Observe
    if (now - _state.lastObserve >= OBSERVE_INTERVAL_MS) {
      const obs = observe();
      _state.lastObserve = now;

      // Think
      if (now - _state.lastThink >= THINK_INTERVAL_MS) {
        const decision = think(obs);
        _state.lastThink = now;

        // Act
        if (now - _state.lastAct >= ACT_INTERVAL_MS) {
          await act(decision);
          _state.lastAct = now;
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, "[AutoEngine] Loop error");
  }

  // Jadwalkan iterasi berikutnya (bukan recursive — pakai setTimeout)
  if (_running) setTimeout(() => void autonomousLoop(), 1000);
}

// ── PUBLIC API ───────────────────────────────────────────────
export function startAutonomousEngine(): void {
  if (_running) return;
  _running = true;
  loadLocalState();

  // Listen P2P messages untuk update state
  receiveMessage((msg) => {
    if (msg.type === "CONSENSUS_RESULT") {
      recordConsensus();
      recordConsensusParticipation();
    }
  });

  // Task generator — setiap 30 detik hasilkan task baru
  setInterval(() => {
    if (_running && Math.random() < 0.4) generateTask(); // 40% chance generate
  }, GEN_TASK_INTERVAL);

  void autonomousLoop();
  logger.info({ nodeId: NODE_ID, nodeType: NODE_TYPE }, "[AutoEngine] Autonomous engine STARTED — fully decentralized");
}

export function stopAutonomousEngine(): void {
  _running = false;
  logger.info("[AutoEngine] Autonomous engine stopped");
}

export function getEngineStatus() {
  return {
    running:   _running,
    cycle:     _state.cycle,
    nodeId:    NODE_ID,
    nodeType:  NODE_TYPE,
    snapshot:  getStateSnapshot(),
  };
}
