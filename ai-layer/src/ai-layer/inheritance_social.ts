export interface SocialHeritage {
  entityId: string;
  parentIds: string[];
  inheritedTraits: Record<string, number>;
  inheritedBeliefs: string[];
  culturalBackground: string;
  generation: number;
}

export interface InheritanceSocialState {
  heritages: SocialHeritage[];
  generationCount: number;
  traitDrift: number;
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

export function init(id: string): InheritanceSocialState {
  return {
    heritages: [],
    generationCount: 1,
    traitDrift: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: InheritanceSocialState): InheritanceSocialState {
  const heritage = state.heritages.find(h => h.entityId === ai.id);
  if (!heritage) return state;

  const traitDrift = Object.entries(heritage.inheritedTraits).reduce((drift, [trait, inherited]) => {
    const current = ai.traits[trait] ?? inherited;
    return drift + Math.abs(current - inherited);
  }, 0) / Math.max(1, Object.keys(heritage.inheritedTraits).length);

  return { ...state, traitDrift };
}

export function createOffspring(parent1: AIEntity, parent2: AIEntity, offspringId: string, state: InheritanceSocialState): [SocialHeritage, InheritanceSocialState] {
  const inheritedTraits: Record<string, number> = {};
  const allTraitKeys = new Set([...Object.keys(parent1.traits), ...Object.keys(parent2.traits)]);

  for (const key of allTraitKeys) {
    const p1Val = parent1.traits[key] ?? 0.5;
    const p2Val = parent2.traits[key] ?? 0.5;
    const mutation = (Math.random() - 0.5) * 0.1;
    inheritedTraits[key] = Math.max(0, Math.min(1, (p1Val + p2Val) / 2 + mutation));
  }

  const parentHeritages = state.heritages.filter(h => h.entityId === parent1.id || h.entityId === parent2.id);
  const maxGen = parentHeritages.reduce((max, h) => Math.max(max, h.generation), 0);

  const heritage: SocialHeritage = {
    entityId: offspringId,
    parentIds: [parent1.id, parent2.id],
    inheritedTraits,
    inheritedBeliefs: [],
    culturalBackground: 'mixed',
    generation: maxGen + 1,
  };

  const newState: InheritanceSocialState = {
    heritages: [...state.heritages, heritage],
    generationCount: Math.max(state.generationCount, heritage.generation),
    traitDrift: state.traitDrift,
  };

  return [heritage, newState];
}
