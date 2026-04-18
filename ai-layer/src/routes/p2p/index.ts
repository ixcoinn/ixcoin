// ============================================================
// ROUTES/P2P/INDEX.TS — REST endpoints untuk P2P Network
// UPGRADE: Tambah gossip, local state, reputation endpoints
// ============================================================

import { Router } from "express";
import { getP2PStatus, connectToPeer, broadcast, gossipBroadcast, NODE_ID } from "../../p2p/p2p_network.js";
import { nodeRegistry } from "../../p2p/node_registry.js";
import { createTask, getAllTasks, getPendingTasks, pullTask } from "../../p2p/task_queue.js";
import { getValidationSummary } from "../../p2p/validation_system.js";
import { getStateSnapshot } from "../../p2p/local_state.js";

const p2pRouter = Router();

p2pRouter.get('/p2p/status", (_req, res) => {
  res.json({ success: true, data: getP2PStatus() });
});

p2pRouter.get('/p2p/nodes", (_req, res) => {
  res.json({
    success: true,
    data: { nodes: nodeRegistry.getAllNodes(), stats: nodeRegistry.getStats() },
  });
});

p2pRouter.post('/p2p/connect", (req, res) => {
  const { peerAddress } = req.body as { peerAddress?: string };
  if (!peerAddress) { res.status(400).json({ success: false, error: "peerAddress required" }); return; }
  connectToPeer(peerAddress);
  res.json({ success: true, message: "Connecting to " + peerAddress });
});

p2pRouter.get('/p2p/tasks", (_req, res) => {
  res.json({ success: true, data: { tasks: getAllTasks(), pending: getPendingTasks().length } });
});

p2pRouter.post('/p2p/tasks", (req, res) => {
  const { type, payload, priority } = req.body as { type?: string; payload?: Record<string, unknown>; priority?: number };
  if (!type) { res.status(400).json({ success: false, error: "type required" }); return; }
  const task = createTask(type as "TX_VALIDATE" | "AI_INFERENCE" | "CONSENSUS" | "MEMPOOL_SCAN", payload ?? {}, priority ?? 5);
  res.json({ success: true, data: task });
});

// [NEW] Pull task — node ambil task sendiri (pull model)
p2pRouter.post('/p2p/tasks/pull", (_req, res) => {
  const task = pullTask();
  if (!task) { res.json({ success: true, data: null, message: "No pending tasks" }); return; }
  res.json({ success: true, data: task });
});

p2pRouter.get('/p2p/validation", (_req, res) => {
  res.json({ success: true, data: getValidationSummary() });
});

p2pRouter.post('/p2p/broadcast", (req, res) => {
  const { messageType, payload } = req.body as { messageType?: string; payload?: Record<string, unknown> };
  broadcast({
    type: (messageType ?? "HEARTBEAT") as "HEARTBEAT",
    from: NODE_ID,
    payload: payload ?? {},
    timestamp: Date.now(),
  });
  res.json({ success: true, message: "Message broadcast" });
});

// [NEW] Gossip broadcast — fanout ke subset peer
p2pRouter.post('/p2p/gossip", (req, res) => {
  const { messageType, payload, fanout } = req.body as { messageType?: string; payload?: Record<string, unknown>; fanout?: number };
  gossipBroadcast({
    type: (messageType ?? "HEARTBEAT") as "HEARTBEAT",
    from: NODE_ID,
    payload: payload ?? {},
    timestamp: Date.now(),
  }, fanout ?? 3);
  res.json({ success: true, message: "Gossip sent" });
});

// [NEW] Local state snapshot
p2pRouter.get('/p2p/local-state", (_req, res) => {
  res.json({ success: true, data: getStateSnapshot() });
});

export default p2pRouter;
