export interface Creation {
  id: string;
  type: 'artifact' | 'idea' | 'system' | 'entity' | 'world';
  creatorId: string;
  description: string;
  quality: number;
  impact: number;
  tick: number;
}

export interface CreationEngineState {
  creations: Creation[];
  creativeOutput: number;
  totalCreations: number;
  creativeBlock: boolean;
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

export function init(id: string): CreationEngineState {
  return {
    creations: [],
    creativeOutput: 0,
    totalCreations: 0,
    creativeBlock: false,
  };
}

export function update(ai: AIEntity, world: WorldState, state: CreationEngineState): CreationEngineState {
  const creativity = ai.traits['creativity'] ?? 0.3;
  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const energy = ai.traits['energy'] ?? 0.7;
  const creativeBlock = energy < 0.2 || (ai.traits['stress'] ?? 0) > 0.8;

  const creativeOutput = creativeBlock ? 0 : creativity * intelligence * energy;
  let totalCreations = state.totalCreations;
  const creations = [...state.creations];

  if (!creativeBlock && Math.random() < creativeOutput * 0.1) {
    const types: Creation['type'][] = ['artifact', 'idea', 'system', 'entity', 'world'];
    const type = types[Math.floor(Math.random() * types.length)] ?? 'idea';
    creations.push({
      id: `cr_${world.tick}`,
      type,
      creatorId: ai.id,
      description: `${type} created by ${ai.id} at tick ${world.tick}`,
      quality: creativeOutput,
      impact: Math.random() * creativeOutput,
      tick: world.tick,
    });
    totalCreations++;
  }

  return { creations: creations.slice(-30), creativeOutput, totalCreations, creativeBlock };
}

export function createThing(state: CreationEngineState, creation: Creation): CreationEngineState {
  return { ...state, creations: [...state.creations, creation].slice(-30), totalCreations: state.totalCreations + 1 };
}
