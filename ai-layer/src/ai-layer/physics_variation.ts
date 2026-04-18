export interface PhysicsConstant {
  name: string;
  value: number;
  baseline: number;
  variance: number;
  mutable: boolean;
}

export interface PhysicsVariationState {
  constants: PhysicsConstant[];
  anomalies: { constant: string; deviation: number; tick: number }[];
  physicsStability: number;
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

export function init(id: string): PhysicsVariationState {
  return {
    constants: [
      { name: 'gravity', value: 9.8, baseline: 9.8, variance: 0.1, mutable: true },
      { name: 'time_flow', value: 1.0, baseline: 1.0, variance: 0.05, mutable: true },
      { name: 'entropy_rate', value: 0.01, baseline: 0.01, variance: 0.005, mutable: true },
      { name: 'causality_strength', value: 1.0, baseline: 1.0, variance: 0.02, mutable: false },
    ],
    anomalies: [],
    physicsStability: 1,
  };
}

export function update(ai: AIEntity, world: WorldState, state: PhysicsVariationState): PhysicsVariationState {
  const chaos = 1 - (ai.traits['order'] ?? 0.5);
  const anomalies = [...state.anomalies];

  const constants = state.constants.map(c => {
    if (!c.mutable) return c;
    const drift = (Math.random() - 0.5) * c.variance * chaos;
    const newValue = Math.max(0, c.value + drift);
    const deviation = Math.abs(newValue - c.baseline);
    if (deviation > c.variance * 2) {
      anomalies.push({ constant: c.name, deviation, tick: world.tick });
    }
    return { ...c, value: newValue };
  });

  const physicsStability = constants.reduce((s, c) => {
    const dev = Math.abs(c.value - c.baseline) / (c.baseline || 1);
    return s - dev * 0.1;
  }, 1);

  return { constants, anomalies: anomalies.slice(-20), physicsStability: Math.max(0, physicsStability) };
}

export function forceVariation(state: PhysicsVariationState, constantName: string, newValue: number): PhysicsVariationState {
  const constants = state.constants.map(c => c.name === constantName && c.mutable ? { ...c, value: newValue } : c);
  return { ...state, constants };
}
