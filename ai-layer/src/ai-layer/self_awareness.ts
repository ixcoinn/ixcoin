export interface SelfAwarenessState {
  id: string;
  selfModel: Record<string, unknown>;
  knownCapabilities: string[];
  knownLimitations: string[];
  introspectionDepth: number;
  awarenessLevel: number;
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

export function init(id: string): SelfAwarenessState {
  return {
    id,
    selfModel: {},
    knownCapabilities: [],
    knownLimitations: [],
    introspectionDepth: 1,
    awarenessLevel: 0.1,
  };
}

export function update(ai: AIEntity, world: WorldState, state: SelfAwarenessState): SelfAwarenessState {
  const knownCapabilities = Object.keys(ai.traits).filter(t => (ai.traits[t] ?? 0) > 0.5);
  const knownLimitations = Object.keys(ai.traits).filter(t => (ai.traits[t] ?? 0) < 0.3);
  const awarenessLevel = Math.min(1, state.awarenessLevel + 0.001 * world.tick);
  return {
    ...state,
    selfModel: { ...ai.traits },
    knownCapabilities,
    knownLimitations,
    introspectionDepth: Math.floor(awarenessLevel * 10),
    awarenessLevel,
  };
}

export function getSelfReport(state: SelfAwarenessState): string {
  return `Entity ${state.id}: awareness=${state.awarenessLevel.toFixed(2)}, caps=${state.knownCapabilities.join(',')}, limits=${state.knownLimitations.join(',')}`;
}
