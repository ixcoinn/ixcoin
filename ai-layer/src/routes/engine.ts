// ============================================================
// ROUTES/ENGINE.TS — [NEW] REST endpoints untuk Autonomous Engine
// ============================================================

import { Router } from "express";
import { getEngineStatus, startAutonomousEngine, stopAutonomousEngine } from "../ai-layer/autonomous_engine.js";
import { getLocalState } from "../p2p/local_state.js";
import { getDbInfo } from "../lib/db.js";

const engineRouter = Router();

engineRouter.get("/engine/status", (_req, res) => {
  res.json({ success: true, data: getEngineStatus() });
});

engineRouter.get("/engine/state", (_req, res) => {
  res.json({ success: true, data: getLocalState() });
});

engineRouter.get("/engine/db", (_req, res) => {
  res.json({ success: true, data: getDbInfo() });
});

engineRouter.post("/engine/start", (_req, res) => {
  startAutonomousEngine();
  res.json({ success: true, message: "Autonomous engine started" });
});

engineRouter.post("/engine/stop", (_req, res) => {
  stopAutonomousEngine();
  res.json({ success: true, message: "Autonomous engine stopped" });
});

export default engineRouter;
