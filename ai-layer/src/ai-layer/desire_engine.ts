export interface Desire {
  id: string;
  target: string;
  intensity: number;
  urgency: number;
  fulfilled: boolean;
}

export interface DesireEngineState {
  desires: Desire[];
  dominantDesire: string | null;
  frustrationLevel: number;
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

export function init(id: string): DesireEngineState {
  return {
    desires: [],
    dominantDesire: null,
    frustrationLevel: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: DesireEngineState): DesireEngineState {
  const needs: Record<string, number> = {
    survival: 1 - (ai.traits['health'] ?? 1),
    social: 1 - (ai.traits['social'] ?? 0.5),
    power: ai.traits['ambition'] ?? 0.3,
    knowledge: ai.traits['curiosity'] ?? 0.4,
    comfort: 1 - (ai.traits['stress'] ?? 0),
  };

  const desires: Desire[] = Object.entries(needs)
    .filter(([, intensity]) => intensity > 0.2)
    .map(([target, intensity]) => ({
      id: `${ai.id}_${target}`,
      target,
      intensity,
      urgency: intensity * (1 + world.tick * 0.001),
      fulfilled: false,
    }));

  const sorted = desires.sort((a, b) => b.urgency - a.urgency);
  const dominantDesire = sorted[0]?.target ?? null;
  const unfulfilled = desires.filter(d => !d.fulfilled);
  const frustrationLevel = Math.min(1, unfulfilled.reduce((s, d) => s + d.intensity * 0.1, state.frustrationLevel));

  return { desires, dominantDesire, frustrationLevel };
}

export function fulfillDesire(state: DesireEngineState, desireId: string): DesireEngineState {
  const desires = state.desires.map(d => d.id === desireId ? { ...d, fulfilled: true } : d);
  const frustrationLevel = Math.max(0, state.frustrationLevel - 0.1);
  return { ...state, desires, frustrationLevel };
}
