// ============================================================
// INDEX.TS — Entry Point
// UPGRADE: Autonomous AI Engine + P2P Decentralized Network
// Node berjalan mandiri tanpa server pusat
// ============================================================

import app from "./app.js";
import { logger } from "./lib/logger.js";
import { startMonitor, stopMonitor } from "./activity/transaction_monitor.js";
import { getCivilizationState } from "./ai-layer/state.js";
import { initP2PServer, connectToInitialPeers, startHeartbeat } from "./p2p/p2p_network.js";
import { initTaskQueueHandlers } from "./p2p/task_queue.js";
import { initValidationHandlers } from "./p2p/validation_system.js";
import { loadLocalState } from "./p2p/local_state.js";
import { startAutonomousEngine } from "./ai-layer/autonomous_engine.js";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = parseInt(rawPort, 10);
if (isNaN(port)) throw new Error("PORT must be a valid number: " + rawPort);

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "AI Layer server started");

  // ── LOCAL STATE: Load per-node state dari disk ──────────────
  try {
    loadLocalState();
    logger.info("[LocalState] Node state loaded from disk");
  } catch (err) {
    logger.warn({ err }, "[LocalState] Failed to load — starting fresh");
  }

  // ── CIVILIZATION: Inisialisasi dunia AI ────────────────────
  try {
    startMonitor();
    getCivilizationState();
    logger.info("Autonomous Digital Civilization is ALIVE!");
  } catch (err) {
    logger.warn({ err }, "[Civilization] Failed to start — continuing without");
  }

  // ── P2P DECENTRALIZED NETWORK ──────────────────────────────
  try {
    initP2PServer();
    initTaskQueueHandlers();
    initValidationHandlers();
    connectToInitialPeers();
    startHeartbeat();
    logger.info("[P2P] Decentralized AI Network initialized");
  } catch (err) {
    logger.warn({ err }, "[P2P] Network init failed — running in standalone mode");
  }

  // ── [NEW] AUTONOMOUS ENGINE: Self-running AI tanpa request ─
  try {
    startAutonomousEngine();
    logger.info("[AutoEngine] Autonomous engine running — node is fully self-sustaining");
  } catch (err) {
    logger.warn({ err }, "[AutoEngine] Failed to start autonomous engine");
  }

  logger.info({
    mode:       "DECENTRALIZED",
    nodeType:   process.env["NODE_TYPE"] ?? "AI_NODE",
    nodeId:     process.env["NODE_ID"] ?? "auto-generated",
    p2pPort:    process.env["P2P_PORT"] ?? "9080",
    initialPeers: process.env["INITIAL_PEERS"] ?? "none",
  }, "[STARTUP] IXCoin AI Node fully operational");
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received — shutting down");
  try { stopMonitor(); } catch { /* ignore */ }
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  logger.info("SIGINT received — shutting down");
  try { stopMonitor(); } catch { /* ignore */ }
  server.close(() => process.exit(0));
});
