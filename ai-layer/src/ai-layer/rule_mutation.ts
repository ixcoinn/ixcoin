export interface RuleMutation {
  id: string;
  originalRuleId: string;
  mutationType: 'amplify' | 'weaken' | 'invert' | 'nullify';
  magnitude: number;
  cause: string;
  tick: number;
}

export interface RuleMutationState {
  mutations: RuleMutation[];
  mutationFrequency: number;
  systemStability: number;
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

export function init(id: string): RuleMutationState {
  return {
    mutations: [],
    mutationFrequency: 0.01,
    systemStability: 1,
  };
}

export function update(ai: AIEntity, world: WorldState, state: RuleMutationState): RuleMutationState {
  const chaos = 1 - (ai.traits['order'] ?? 0.5);
  const effectiveMutFreq = state.mutationFrequency * (1 + chaos);

  const mutations = [...state.mutations];
  const ruleIds = Object.keys(world.rules);

  if (ruleIds.length > 0 && Math.random() < effectiveMutFreq) {
    const ruleId = ruleIds[Math.floor(Math.random() * ruleIds.length)] ?? 'unknown';
    const types: RuleMutation['mutationType'][] = ['amplify', 'weaken', 'invert', 'nullify'];
    mutations.push({
      id: `rm_${world.tick}`,
      originalRuleId: ruleId,
      mutationType: types[Math.floor(Math.random() * types.length)] ?? 'weaken',
      magnitude: Math.random() * chaos,
      cause: chaos > 0.5 ? 'chaos_cascade' : 'random',
      tick: world.tick,
    });
  }

  const systemStability = Math.max(0, 1 - mutations.length * 0.02);

  return { mutations: mutations.slice(-20), mutationFrequency: effectiveMutFreq, systemStability };
}

export function applyMutation(state: RuleMutationState, mutation: RuleMutation, ruleValue: number): number {
  switch (mutation.mutationType) {
    case 'amplify': return Math.min(2, ruleValue * (1 + mutation.magnitude));
    case 'weaken': return Math.max(0, ruleValue * (1 - mutation.magnitude));
    case 'invert': return 1 - ruleValue;
    case 'nullify': return 0;
  }
}
