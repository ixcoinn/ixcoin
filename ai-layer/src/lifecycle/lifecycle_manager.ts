import { logger } from "../lib/logger.js";
import {
  activateInstance,
  dormantInstance,
  archiveInstance,
  getInstanceById,
} from "../ai-layer/ai_core.js";
import { canTransition, type LifecycleTransition } from "./state_machine.js";

export async function requestTransition(
  instanceId: string,
  transition: LifecycleTransition,
  reason: string,
) {
  const instance = await getInstanceById(instanceId);
  if (!instance) {
    throw new Error(`AI instance not found: ${instanceId}`);
  }

  if (!canTransition(instance.status, transition)) {
    throw new Error(
      `Cannot apply transition '${transition}' to instance in status '${instance.status}'`,
    );
  }

  logger.info(
    { instanceId, from: instance.status, transition, reason },
    "Lifecycle transition requested",
  );

  switch (transition) {
    case "ACTIVATE":
    case "REVIVE":
      return activateInstance(instanceId);
    case "DORMANT":
      return dormantInstance(instanceId, reason);
    case "ARCHIVE":
      return archiveInstance(instanceId);
  }
}
