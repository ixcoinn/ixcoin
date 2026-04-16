import { type AiStatus } from "../ai-layer/ai_state.js";

export type LifecycleTransition =
  | "ACTIVATE"
  | "DORMANT"
  | "ARCHIVE"
  | "REVIVE";

const VALID_TRANSITIONS: Record<AiStatus, LifecycleTransition[]> = {
  ACTIVE: ["DORMANT", "ARCHIVE"],
  DORMANT: ["ACTIVATE", "REVIVE", "ARCHIVE"],
  ARCHIVED: [],
};

export function canTransition(
  from: AiStatus,
  transition: LifecycleTransition,
): boolean {
  return VALID_TRANSITIONS[from].includes(transition);
}

export function getNextStatus(transition: LifecycleTransition): AiStatus {
  switch (transition) {
    case "ACTIVATE":
    case "REVIVE":
      return "ACTIVE";
    case "DORMANT":
      return "DORMANT";
    case "ARCHIVE":
      return "ARCHIVED";
  }
}

export function describeTransition(
  from: AiStatus,
  transition: LifecycleTransition,
): string {
  const to = getNextStatus(transition);
  return `${from} → ${to} via ${transition}`;
}
