export interface ChaosEvent {
  id: string;
  type: 'random' | 'cascade' | 'paradox' | 'disruption';
  magnitude: number;
  affectedSystems: string[];
  tick: number;
}

export interface ChaosEngineState {
  events: ChaosEvent[];
  chaosLevel: number;
  entropyAccumulation: number;
  stabilityForce: number;
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

export function init(id: string): ChaosEngineState {
  return {
    events: [],
    chaosLevel: 0.1,
    entropyAccumulation: 0,
    stabilityForce: 0.8,
  };
}

export function update(ai: AIEntity, world: WorldState, state: ChaosEngineState): ChaosEngineState {
  const order = (ai.traits['order'] ?? 0.5);
  const entropyAccumulation = Math.min(1, state.entropyAccumulation + (1 - order) * 0.01);
  const chaosLevel = Math.min(1, entropyAccumulation * (1 - state.stabilityForce));

  const events = [...state.events];
  if (chaosLevel > 0.5 && Math.random() < chaosLevel * 0.2) {
    const types: ChaosEvent['type'][] = ['random', 'cascade', 'paradox', 'disruption'];
    const systems = ['economy', 'society', 'politics', 'nature', 'technology'];
    const affectedSystems = systems.filter(() => Math.random() < chaosLevel);
    events.push({
      id: `chaos_${world.tick}`,
      type: types[Math.floor(Math.random() * types.length)] ?? 'random',
      magnitude: chaosLevel,
      affectedSystems,
      tick: world.tick,
    });
  }

  return { events: events.slice(-20), chaosLevel, entropyAccumulation, stabilityForce: state.stabilityForce };
}

export function injectChaos(state: ChaosEngineState, magnitude: number): ChaosEngineState {
  return { ...state, chaosLevel: Math.min(1, state.chaosLevel + magnitude), entropyAccumulation: Math.min(1, state.entropyAccumulation + magnitude * 0.5) };
}
