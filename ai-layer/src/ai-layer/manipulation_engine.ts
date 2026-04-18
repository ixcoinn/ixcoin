export interface ManipulationTactic {
  name: string;
  type: 'emotional' | 'logical' | 'social' | 'fear' | 'reward';
  potency: number;
  target: string;
}

export interface ManipulationEngineState {
  activeTactics: ManipulationTactic[];
  successRate: number;
  resistanceBuilt: Record<string, number>;
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

export function init(id: string): ManipulationEngineState {
  return {
    activeTactics: [],
    successRate: 0,
    resistanceBuilt: {},
  };
}

export function update(ai: AIEntity, world: WorldState, state: ManipulationEngineState): ManipulationEngineState {
  const charisma = ai.traits['charisma'] ?? 0;
  const cunning = ai.traits['cunning'] ?? 0;
  const manipPotential = (charisma + cunning) / 2;

  const activeTactics: ManipulationTactic[] = [];
  if (manipPotential > 0.4) {
    for (const entity of world.entities) {
      if (entity.id === ai.id) continue;
      const resistance = state.resistanceBuilt[entity.id] ?? 0;
      if (manipPotential > resistance + 0.2) {
        const types: ManipulationTactic['type'][] = ['emotional', 'logical', 'social', 'fear', 'reward'];
        activeTactics.push({
          name: 'persuasion',
          type: types[Math.floor(Math.random() * types.length)] ?? 'emotional',
          potency: manipPotential - resistance,
          target: entity.id,
        });
      }
    }
  }

  const successes = activeTactics.filter(t => Math.random() < t.potency).length;
  const successRate = activeTactics.length > 0 ? successes / activeTactics.length : state.successRate;

  const resistanceBuilt = { ...state.resistanceBuilt };
  for (const tactic of activeTactics) {
    resistanceBuilt[tactic.target] = Math.min(1, (resistanceBuilt[tactic.target] ?? 0) + 0.05);
  }

  return { activeTactics, successRate, resistanceBuilt };
}

export function applyManipulation(tactic: ManipulationTactic, target: AIEntity): AIEntity {
  const newTraits = { ...target.traits };
  if (tactic.type === 'fear') newTraits['compliance'] = Math.min(1, (newTraits['compliance'] ?? 0) + tactic.potency * 0.3);
  if (tactic.type === 'reward') newTraits['loyalty'] = Math.min(1, (newTraits['loyalty'] ?? 0) + tactic.potency * 0.2);
  return { ...target, traits: newTraits };
}
