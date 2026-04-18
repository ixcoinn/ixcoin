// ============================================================
// ROUTES/CONTRIBUTION.TS — [NEW] REST endpoints untuk Kontribusi
// ============================================================

import { Router } from "express";
import { getContributionReport, getMyCompletedTasks } from "../ai-layer/contribution_engine.js";
import { NODE_ID } from "../p2p/p2p_network.js";

const contributionRouter = Router();

contributionRouter.get("/contribution/me", (_req, res) => {
  const report = getContributionReport(NODE_ID, "all_time");
  res.json({ success: true, data: report });
});

contributionRouter.get("/contribution/me/:period", (req, res) => {
  const period = (req.params["period"] ?? "all_time") as "all_time" | "24h" | "7d";
  const report = getContributionReport(NODE_ID, period);
  res.json({ success: true, data: report });
});

contributionRouter.get("/contribution/tasks", (_req, res) => {
  const tasks = getMyCompletedTasks();
  res.json({ success: true, data: { tasks, count: tasks.length } });
});

export default contributionRouter;
