export interface Ideology {
  id: string;
  name: string;
  coreValues: string[];
  adherents: string[];
  influence: number;
  radical: boolean;
}

export interface IdeologyEngineState {
  ideologies: Ideology[];
  dominantIdeologyId: string | null;
  polarizationLevel: number;
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

export function init(id: string): IdeologyEngineState {
  return {
    ideologies: [],
    dominantIdeologyId: null,
    polarizationLevel: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: IdeologyEngineState): IdeologyEngineState {
  const ideologies = state.ideologies.map(ideology => {
    const adherents = world.entities
      .filter(e => e.beliefs[ideology.id] !== undefined || ideology.adherents.includes(e.id))
      .map(e => e.id);
    const influence = Math.min(1, adherents.length / Math.max(1, world.entities.length));
    return { ...ideology, adherents, influence };
  });

  ideologies.sort((a, b) => b.influence - a.influence);
  const dominantIdeologyId = ideologies[0]?.id ?? null;

  const polarizationLevel = ideologies.length > 1
    ? Math.abs((ideologies[0]?.influence ?? 0) - (ideologies[1]?.influence ?? 0))
    : 0;

  return { ideologies, dominantIdeologyId, polarizationLevel };
}

export function addIdeology(state: IdeologyEngineState, ideology: Ideology): IdeologyEngineState {
  return { ...state, ideologies: [...state.ideologies, ideology] };
}

export function convertAdherent(state: IdeologyEngineState, entityId: string, fromId: string, toId: string): IdeologyEngineState {
  const ideologies = state.ideologies.map(ideo => {
    if (ideo.id === fromId) return { ...ideo, adherents: ideo.adherents.filter(a => a !== entityId) };
    if (ideo.id === toId) return { ...ideo, adherents: [...ideo.adherents, entityId] };
    return ideo;
  });
  return { ...state, ideologies };
}
