export interface NonExistenceState {
  voidLevel: number;
  erasureRisk: number;
  potentialReturn: number;
  absenceEffects: string[];
  erasedAt: number | null;
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

export function init(id: string): NonExistenceState {
  return {
    voidLevel: 0,
    erasureRisk: 0.001,
    potentialReturn: 0,
    absenceEffects: [],
    erasedAt: null,
  };
}

export function update(ai: AIEntity, world: WorldState, state: NonExistenceState): NonExistenceState {
  const health = ai.traits['health'] ?? 1;
  const vitality = ai.traits['vitality'] ?? 1;
  const erasureRisk = Math.max(0, (1 - health) * (1 - vitality) * 0.1);
  const voidLevel = Math.min(1, state.voidLevel + erasureRisk - 0.001);

  if (voidLevel > 0.9 && !state.erasedAt) {
    return { ...state, voidLevel, erasureRisk, erasedAt: world.tick, absenceEffects: ['reality_gap', 'memory_hole', 'absence_resonance'] };
  }

  const potentialReturn = state.erasedAt !== null ? Math.max(0, 1 - (world.tick - state.erasedAt) / 1000) : 0;
  return { voidLevel, erasureRisk, potentialReturn, absenceEffects: state.absenceEffects, erasedAt: state.erasedAt };
}

export function emerge(state: NonExistenceState): NonExistenceState {
  return { ...state, voidLevel: 0, erasedAt: null, absenceEffects: [], potentialReturn: 0 };
}

export function measure(state: NonExistenceState): number {
  return 1 - state.voidLevel;
}
