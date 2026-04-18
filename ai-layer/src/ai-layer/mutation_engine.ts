export interface Mutation {
  traitName: string;
  oldValue: number;
  newValue: number;
  trigger: string;
  tick: number;
}

export interface MutationEngineState {
  mutations: Mutation[];
  mutationRate: number;
  stabilityScore: number;
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

export function init(id: string): MutationEngineState {
  return {
    mutations: [],
    mutationRate: 0.01,
    stabilityScore: 1.0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: MutationEngineState): [AIEntity, MutationEngineState] {
  const stress = ai.traits['stress'] ?? 0;
  const adaptability = ai.traits['adaptability'] ?? 0.5;
  const effectiveMutationRate = state.mutationRate * (1 + stress) * adaptability;

  const mutations: Mutation[] = [...state.mutations];
  const newTraits = { ...ai.traits };

  for (const [traitName, value] of Object.entries(newTraits)) {
    if (Math.random() < effectiveMutationRate) {
      const delta = (Math.random() - 0.5) * 0.1;
      const newValue = Math.max(0, Math.min(1, value + delta));
      mutations.push({ traitName, oldValue: value, newValue, trigger: 'random', tick: world.tick });
      newTraits[traitName] = newValue;
    }
  }

  const stabilityScore = Math.max(0, 1 - mutations.length * 0.05);
  const trimmedMutations = mutations.slice(-50);

  return [
    { ...ai, traits: newTraits },
    { ...state, mutations: trimmedMutations, stabilityScore },
  ];
}

export function forceMutation(ai: AIEntity, traitName: string, delta: number): AIEntity {
  const current = ai.traits[traitName] ?? 0;
  return { ...ai, traits: { ...ai.traits, [traitName]: Math.max(0, Math.min(1, current + delta)) } };
}
