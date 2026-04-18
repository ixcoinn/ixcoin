import { db, aiInstancesTable, activityEventsTable } from "../../lib/db/src/index.js";
import { eq, and, ne } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger.js";
import {
  calcEnergyAfterTx,
  calcEnergyDrain,
  shouldGoDormant,
  shouldArchive,
  ENERGY_MIN,
  type AiStatus,
} from "./ai_state.js";
import { getOrCreateMemory, loadMemory } from "./ai_memory.js";

export async function createInstance(
  name: string,
  walletAddress?: string | null,
) {
  const id = randomUUID();
  const [instance] = await db
    .insert(aiInstancesTable)
    .values({
      id,
      name,
      status: "DORMANT",
      energyLevel: 50,
      walletAddress: walletAddress ?? null,
    })
    .returning();

  await getOrCreateMemory(id);
  await logEvent("AI_DORMANT", id, { reason: "newly_created" });
  logger.info({ instanceId: id, name }, "AI instance created");
  return instance;
}

export async function activateInstance(id: string) {
  const [instance] = await db
    .update(aiInstancesTable)
    .set({
      status: "ACTIVE",
      lastActiveAt: new Date(),
      energyLevel: 100,
    })
    .where(eq(aiInstancesTable.id, id))
    .returning();

  if (instance) {
    const memory = await loadMemory(id);
    await logEvent("AI_ACTIVATED", id, {
      memoryCheckpointAt: memory?.checkpointAt ?? null,
      revivedFromStatus: instance.status,
    });
    logger.info({ instanceId: id }, "AI instance activated");
  }
  return instance;
}

export async function dormantInstance(id: string, reason: string) {
  const [instance] = await db
    .update(aiInstancesTable)
    .set({ status: "DORMANT" })
    .where(eq(aiInstancesTable.id, id))
    .returning();

  if (instance) {
    await logEvent("AI_DORMANT", id, { reason });
    logger.info({ instanceId: id, reason }, "AI instance went dormant");
  }
  return instance;
}

export async function archiveInstance(id: string) {
  const [instance] = await db
    .update(aiInstancesTable)
    .set({ status: "ARCHIVED" })
    .where(eq(aiInstancesTable.id, id))
    .returning();

  if (instance) {
    await logEvent("AI_ARCHIVED", id, {
      lastActiveAt: instance.lastActiveAt,
    });
    logger.info({ instanceId: id }, "AI instance archived");
  }
  return instance;
}

export async function onTransactionDetected(txCount: number) {
  const activeAndDormant = await db
    .select()
    .from(aiInstancesTable)
    .where(ne(aiInstancesTable.status, "ARCHIVED"));

  let instancesRevived = 0;

  for (const instance of activeAndDormant) {
    const newEnergy = calcEnergyAfterTx(instance.energyLevel);

    if (instance.status === "DORMANT") {
      await db
        .update(aiInstancesTable)
        .set({
          status: "ACTIVE",
          lastActiveAt: new Date(),
          energyLevel: newEnergy,
        })
        .where(eq(aiInstancesTable.id, instance.id));

      const memory = await loadMemory(instance.id);
      await logEvent("AI_ACTIVATED", instance.id, {
        reason: "transaction_detected",
        txCount,
        memoryCheckpointAt: memory?.checkpointAt ?? null,
      });
      logger.info(
        { instanceId: instance.id, txCount },
        "AI instance auto-revived by transaction",
      );
      instancesRevived++;
    } else {
      await db
        .update(aiInstancesTable)
        .set({
          lastActiveAt: new Date(),
          energyLevel: newEnergy,
        })
        .where(eq(aiInstancesTable.id, instance.id));

      await logEvent("ENERGY_CHANGED", instance.id, {
        reason: "transaction_detected",
        txCount,
        oldEnergy: instance.energyLevel,
        newEnergy,
      });
    }
  }

  return instancesRevived;
}

export async function tickEnergyAndLifecycle() {
  const now = Date.now();
  const activeInstances = await db
    .select()
    .from(aiInstancesTable)
    .where(eq(aiInstancesTable.status, "ACTIVE"));

  let dormanted = 0;

  for (const instance of activeInstances) {
    if (shouldArchive(instance.lastActiveAt, now)) {
      await archiveInstance(instance.id);
      continue;
    }

    if (shouldGoDormant(instance.lastActiveAt, now)) {
      const newEnergy = calcEnergyDrain(instance.energyLevel);
      await db
        .update(aiInstancesTable)
        .set({ status: "DORMANT", energyLevel: newEnergy })
        .where(eq(aiInstancesTable.id, instance.id));

      await logEvent("AI_DORMANT", instance.id, {
        reason: "inactivity_timeout",
        energyLevel: newEnergy,
      });
      logger.info(
        { instanceId: instance.id, energyLevel: newEnergy },
        "AI instance went dormant due to inactivity",
      );
      dormanted++;
    }
  }

  return dormanted;
}

export async function getAllInstances() {
  return db.select().from(aiInstancesTable);
}

export async function getInstanceById(id: string) {
  const rows = await db
    .select()
    .from(aiInstancesTable)
    .where(eq(aiInstancesTable.id, id));
  return rows[0] ?? null;
}

async function logEvent(
  eventType:
    | "TRANSACTION_DETECTED"
    | "AI_ACTIVATED"
    | "AI_DORMANT"
    | "AI_ARCHIVED"
    | "ENERGY_CHANGED",
  instanceId: string | null,
  details: Record<string, unknown>,
) {
  await db.insert(activityEventsTable).values({
    id: randomUUID(),
    eventType,
    instanceId,
    details,
  });
}

export { logEvent };
