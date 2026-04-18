export interface PerceptionInput {
  source: string;
  type: 'visual' | 'social' | 'environmental' | 'emotional';
  rawValue: number;
  perceivedValue: number;
}

export interface PerceptionEngineState {
  inputs: PerceptionInput[];
  perceptualAccuracy: number;
  attentionFocus: string | null;
  filterBias: Record<string, number>;
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

export function init(id: string): PerceptionEngineState {
  return {
    inputs: [],
    perceptualAccuracy: 0.8,
    attentionFocus: null,
    filterBias: {},
  };
}

export function update(ai: AIEntity, world: WorldState, state: PerceptionEngineState): PerceptionEngineState {
  const perception = ai.traits['perception'] ?? 0.5;
  const stress = ai.traits['stress'] ?? 0;
  const perceptualAccuracy = Math.max(0.1, perception * (1 - stress * 0.5));

  const inputs: PerceptionInput[] = world.entities
    .filter(e => e.id !== ai.id)
    .slice(0, 5)
    .map(e => {
      const rawValue = e.traits['threat'] ?? e.traits['power'] ?? 0.3;
      const bias = state.filterBias[e.id] ?? 0;
      const noise = (Math.random() - 0.5) * (1 - perceptualAccuracy);
      return {
        source: e.id,
        type: 'social' as PerceptionInput['type'],
        rawValue,
        perceivedValue: Math.max(0, Math.min(1, rawValue + bias + noise)),
      };
    });

  const highestThreat = inputs.sort((a, b) => b.perceivedValue - a.perceivedValue)[0];
  const attentionFocus = highestThreat ? highestThreat.source : null;

  return { inputs, perceptualAccuracy, attentionFocus, filterBias: state.filterBias };
}

export function setBias(state: PerceptionEngineState, entityId: string, bias: number): PerceptionEngineState {
  return { ...state, filterBias: { ...state.filterBias, [entityId]: bias } };
}
