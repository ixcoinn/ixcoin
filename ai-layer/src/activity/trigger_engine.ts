import { logger } from "../lib/logger.js";
import { runActivityCheck } from "./transaction_monitor.js";
import { db, aiInstancesTable } from "../../lib/db/src/index.js";
import { eq, ne } from "drizzle-orm";

export async function triggerManualCheck() {
  logger.info("Manual activity check triggered");
  const result = await runActivityCheck();

  const activeInstances = await db
    .select()
    .from(aiInstancesTable)
    .where(eq(aiInstancesTable.status, "ACTIVE"));

  const dormantInstances = await db
    .select()
    .from(aiInstancesTable)
    .where(eq(aiInstancesTable.status, "DORMANT"));

  return {
    transactionsFound: result.txCount,
    instancesRevived: result.instancesRevived,
    instancesDormanted: result.dormanted,
    message:
      result.txCount > 0
        ? `Detected ${result.txCount} transaction(s). ${result.instancesRevived} AI instance(s) revived.`
        : "No new transactions detected. Lifecycle tick applied.",
  };
}
