import { db, aiMemoriesTable } from "../../lib/db/src/index.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger.js";

export async function getOrCreateMemory(instanceId: string) {
  const existing = await db
    .select()
    .from(aiMemoriesTable)
    .where(eq(aiMemoriesTable.instanceId, instanceId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(aiMemoriesTable)
    .values({
      id: randomUUID(),
      instanceId,
      memories: {},
      checkpointAt: new Date(),
    })
    .returning();

  logger.info({ instanceId }, "Created new memory store for AI instance");
  return created;
}

export async function saveMemory(
  instanceId: string,
  memories: Record<string, unknown>,
) {
  const existing = await db
    .select()
    .from(aiMemoriesTable)
    .where(eq(aiMemoriesTable.instanceId, instanceId))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(aiMemoriesTable)
      .set({ memories, checkpointAt: new Date() })
      .where(eq(aiMemoriesTable.instanceId, instanceId))
      .returning();
    logger.info({ instanceId }, "Checkpointed AI memory");
    return updated;
  }

  const [created] = await db
    .insert(aiMemoriesTable)
    .values({
      id: randomUUID(),
      instanceId,
      memories,
      checkpointAt: new Date(),
    })
    .returning();
  return created;
}

export async function loadMemory(instanceId: string) {
  const rows = await db
    .select()
    .from(aiMemoriesTable)
    .where(eq(aiMemoriesTable.instanceId, instanceId))
    .limit(1);
  return rows[0] ?? null;
}
