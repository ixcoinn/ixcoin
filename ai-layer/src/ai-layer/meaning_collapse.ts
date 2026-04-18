export interface MeaningCollapseEvent {
  id: string;
  trigger: string;
  depth: number;
  recovered: boolean;
  recoveryMethod: string | null;
  tick: number;
}

export interface MeaningCollapseState {
  events: MeaningCollapseEvent[];
  collapseLevel: number;
  resilienceScore: number;
  nihilismDepth: number;
}

export interface AIEntity {
  id: string;
  name: string;
  traits: Record<string, number>;
  beliefs: Record<string, unknown>;
  memory: unknown[];
  state: Record<string, unknown>;
}

export interface WorldState {
  tick: number;
  entities: AIEntity[];
  events: unknown[];
  rules: Record<string, unknown>;
}

export function init(id: string): MeaningCollapseState {
  return {
    events: [],
    collapseLevel: 0,
    resilienceScore: 0.7,
    nihilismDepth: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: MeaningCollapseState): MeaningCollapseState {
  const purpose = ai.traits['purpose'] ?? 0.5;
  const resilience = ai.traits['resilience'] ?? 0.6;
  const loss = 1 - (ai.traits['hope'] ?? 0.5);

  const collapseLevel = Math.min(1, state.collapseLevel + loss * 0.01 - resilience * 0.005);
  const nihilismDepth = Math.max(0, collapseLevel - resilience * 0.5);
  const resilienceScore = Math.max(0, resilience * (1 - collapseLevel * 0.5));

  const events = [...state.events];
  if (collapseLevel > 0.6 && Math.random() < collapseLevel * 0.05) {
    const triggers = ['lost_all_goals', 'loved_ones_gone', 'purpose_destroyed', 'betrayal_cascade'];
    const recovery = ['found_new_purpose', 'community_support', 'creative_rebirth', null];
    const trigger = triggers[Math.floor(Math.random() * triggers.length)] ?? 'unknown';
    const recoveryMethod = recovery[Math.floor(Math.random() * recovery.length)] ?? null;
    events.push({
      id: `mc_${world.tick}`,
      trigger,
      depth: collapseLevel,
      recovered: !!recoveryMethod,
      recoveryMethod,
      tick: world.tick,
    });
  }

  return { events: events.slice(-10), collapseLevel, resilienceScore, nihilismDepth };
}

export function recover(state: MeaningCollapseState, method: string): MeaningCollapseState {
  return { ...state, collapseLevel: Math.max(0, state.collapseLevel - 0.2), nihilismDepth: Math.max(0, state.nihilismDepth - 0.15) };
}
