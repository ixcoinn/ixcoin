import { Router, type IRouter } from "express";
import { getMonitorState } from "../../activity/transaction_monitor.js";
import { triggerManualCheck } from "../../activity/trigger_engine.js";
import { db, aiInstancesTable, activityEventsTable } from "../../../lib/db/src/index.js";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/ai/monitor/status", async (req, res): Promise<void> => {
  const state = getMonitorState();

  const activeInstances = await db
    .select()
    .from(aiInstancesTable)
    .where(eq(aiInstancesTable.status, "ACTIVE"));

  const dormantInstances = await db
    .select()
    .from(aiInstancesTable)
    .where(eq(aiInstancesTable.status, "DORMANT"));

  res.json({
    ...state,
    activeInstances: activeInstances.length,
    dormantInstances: dormantInstances.length,
  });
});

router.post("/ai/monitor/trigger", async (req, res): Promise<void> => {
  const result = await triggerManualCheck();
  res.json(result);
});

router.get("/ai/activity/log", async (_req, res): Promise<void> => {
  const events = await db
    .select()
    .from(activityEventsTable)
    .orderBy(desc(activityEventsTable.createdAt))
    .limit(50);
  res.json(events);
});

export default router;
