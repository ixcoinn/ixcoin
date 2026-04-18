export interface Species {
  id: string;
  name: string;
  members: string[];
  coreTraits: Record<string, number>;
  divergenceScore: number;
  generation: number;
}

export interface SpeciesDivergenceState {
  species: Species[];
  divergenceRate: number;
  speciationEvents: { tick: number; parentId: string; childId: string }[];
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

export function init(id: string): SpeciesDivergenceState {
  return {
    species: [],
    divergenceRate: 0.001,
    speciationEvents: [],
  };
}

export function update(ai: AIEntity, world: WorldState, state: SpeciesDivergenceState): SpeciesDivergenceState {
  const species = state.species.map(sp => {
    const memberEntities = world.entities.filter(e => sp.members.includes(e.id));
    if (memberEntities.length === 0) return sp;

    const avgTraits: Record<string, number> = {};
    for (const [trait] of Object.entries(sp.coreTraits)) {
      avgTraits[trait] = memberEntities.reduce((s, e) => s + (e.traits[trait] ?? 0), 0) / memberEntities.length;
    }

    const divergenceScore = Object.keys(sp.coreTraits).reduce((d, trait) => {
      return d + Math.abs((avgTraits[trait] ?? 0) - (sp.coreTraits[trait] ?? 0));
    }, 0) / Math.max(1, Object.keys(sp.coreTraits).length);

    return { ...sp, coreTraits: avgTraits, divergenceScore };
  });

  const speciationEvents = [...state.speciationEvents];
  for (const sp of species) {
    if (sp.divergenceScore > 0.3 && Math.random() < state.divergenceRate) {
      const newSpeciesId = `${sp.id}_diverged_${world.tick}`;
      const splitMembers = sp.members.slice(0, Math.floor(sp.members.length / 2));
      species.push({ ...sp, id: newSpeciesId, members: splitMembers, generation: sp.generation + 1 });
      speciationEvents.push({ tick: world.tick, parentId: sp.id, childId: newSpeciesId });
    }
  }

  return { species: species.slice(-20), divergenceRate: state.divergenceRate, speciationEvents: speciationEvents.slice(-10) };
}

export function registerSpecies(state: SpeciesDivergenceState, species: Species): SpeciesDivergenceState {
  return { ...state, species: [...state.species, species] };
}
