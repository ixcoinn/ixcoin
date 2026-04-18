export interface Bias {
  name: string;
  strength: number;
  trigger: string;
  effect: string;
}

export interface CognitiveBiasState {
  activeBiases: Bias[];
  biasHistory: string[];
  totalDistortion: number;
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

const KNOWN_BIASES: Bias[] = [
  { name: 'confirmation_bias', strength: 0.6, trigger: 'new_information', effect: 'filter_contradicting' },
  { name: 'anchoring', strength: 0.5, trigger: 'first_value', effect: 'skew_estimates' },
  { name: 'availability_heuristic', strength: 0.4, trigger: 'recent_event', effect: 'overweight_recent' },
  { name: 'dunning_kruger', strength: 0.3, trigger: 'low_skill', effect: 'overconfidence' },
  { name: 'in_group_bias', strength: 0.7, trigger: 'group_identity', effect: 'favor_in_group' },
];

export function init(id: string): CognitiveBiasState {
  return {
    activeBiases: [],
    biasHistory: [],
    totalDistortion: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: CognitiveBiasState): CognitiveBiasState {
  const stress = (ai.traits['stress'] ?? 0);
  const activeBiases = KNOWN_BIASES.filter(b => Math.random() < b.strength * (1 + stress));
  const totalDistortion = activeBiases.reduce((sum, b) => sum + b.strength, 0);
  const biasHistory = [...state.biasHistory.slice(-49), `tick${world.tick}:${activeBiases.map(b => b.name).join(',')}`];
  return { activeBiases, biasHistory, totalDistortion };
}

export function applyBias(state: CognitiveBiasState, value: number): number {
  let result = value;
  for (const bias of state.activeBiases) {
    if (bias.name === 'anchoring') result = result * 0.8 + value * 0.2;
    if (bias.name === 'dunning_kruger') result = result * 1.2;
    if (bias.name === 'availability_heuristic') result = result * (1 + bias.strength * 0.1);
  }
  return Math.max(0, Math.min(1, result));
}
