export interface AttentionFocus {
  targetId: string;
  priority: number;
  duration: number;
  reason: string;
}

export interface AttentionEngineState {
  foci: AttentionFocus[];
  attentionCapacity: number;
  distractionLevel: number;
  currentPrimaryFocus: string | null;
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

export function init(id: string): AttentionEngineState {
  return {
    foci: [],
    attentionCapacity: 7,
    distractionLevel: 0,
    currentPrimaryFocus: null,
  };
}

export function update(ai: AIEntity, world: WorldState, state: AttentionEngineState): AttentionEngineState {
  const focus = ai.traits['focus'] ?? 0.5;
  const stress = ai.traits['stress'] ?? 0;
  const attentionCapacity = Math.max(1, Math.floor(focus * 7 * (1 - stress * 0.5)));
  const distractionLevel = Math.min(1, stress + (1 - focus) * 0.5);

  const foci: AttentionFocus[] = world.entities
    .filter(e => e.id !== ai.id)
    .map(e => {
      const threat = e.traits['threat'] ?? 0;
      const interest = e.traits['charisma'] ?? 0;
      const priority = Math.max(threat, interest);
      return { targetId: e.id, priority, duration: 1, reason: threat > interest ? 'threat' : 'interest' };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, attentionCapacity);

  const currentPrimaryFocus = foci[0]?.targetId ?? null;

  return { foci, attentionCapacity, distractionLevel, currentPrimaryFocus };
}

export function shiftFocus(state: AttentionEngineState, targetId: string): AttentionEngineState {
  const foci = state.foci.map(f =>
    f.targetId === targetId ? { ...f, priority: f.priority + 0.2 } : { ...f, priority: f.priority * 0.9 }
  );
  foci.sort((a, b) => b.priority - a.priority);
  return { ...state, foci, currentPrimaryFocus: foci[0]?.targetId ?? null };
}
