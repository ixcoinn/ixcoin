export interface EntropyState {
  systemEntropy: number;
  localEntropy: Record<string, number>;
  orderGenerators: string[];
  disorderAmplifiers: string[];
  heatDeath: boolean;
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

export function init(id: string): EntropyState {
  return {
    systemEntropy: 0.1,
    localEntropy: {},
    orderGenerators: [],
    disorderAmplifiers: [],
    heatDeath: false,
  };
}

export function update(ai: AIEntity, world: WorldState, state: EntropyState): EntropyState {
  const order = ai.traits['order'] ?? 0.5;
  const creativity = ai.traits['creativity'] ?? 0.3;
  const chaos = 1 - order;

  const localEntropy = { ...state.localEntropy };
  localEntropy[ai.id] = Math.max(0, Math.min(1, (localEntropy[ai.id] ?? 0.2) + chaos * 0.01 - order * 0.005));

  const systemEntropy = Object.values(localEntropy).reduce((sum, e) => sum + e, 0) / Math.max(1, Object.keys(localEntropy).length);

  const orderGenerators = world.entities.filter(e => (e.traits['order'] ?? 0.5) > 0.7).map(e => e.id);
  const disorderAmplifiers = world.entities.filter(e => (e.traits['chaos'] ?? 0) > 0.6).map(e => e.id);

  const heatDeath = systemEntropy > 0.99;

  return { systemEntropy, localEntropy, orderGenerators, disorderAmplifiers, heatDeath };
}

export function applyOrder(state: EntropyState, entityId: string, amount: number): EntropyState {
  const localEntropy = { ...state.localEntropy, [entityId]: Math.max(0, (state.localEntropy[entityId] ?? 0.5) - amount) };
  return { ...state, localEntropy, systemEntropy: Math.max(0, state.systemEntropy - amount * 0.1) };
}
