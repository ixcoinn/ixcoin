export interface Territory {
  id: string;
  name: string;
  controllerId: string | null;
  resources: number;
  defensibility: number;
  contested: boolean;
  claimants: string[];
}

export interface TerritorySystemState {
  territories: Territory[];
  totalClaimed: number;
  disputedCount: number;
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

export function init(id: string): TerritorySystemState {
  return {
    territories: [],
    totalClaimed: 0,
    disputedCount: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: TerritorySystemState): TerritorySystemState {
  const expansion = ai.traits['expansionism'] ?? 0;
  const military = ai.traits['military'] ?? 0;

  const territories = state.territories.map(t => {
    if (t.controllerId === ai.id) return t;
    const canClaim = expansion > 0.5 && military > t.defensibility && Math.random() < expansion * 0.1;
    if (canClaim) {
      const claimants = [...t.claimants.filter(c => c !== ai.id), ai.id];
      const contested = t.controllerId !== null || claimants.length > 1;
      return { ...t, claimants, contested };
    }
    return t;
  });

  const uncontested = territories.map(t => {
    if (t.claimants.length === 1 && t.claimants[0] === ai.id && !t.contested) {
      return { ...t, controllerId: ai.id };
    }
    return t;
  });

  const totalClaimed = uncontested.filter(t => t.controllerId !== null).length;
  const disputedCount = uncontested.filter(t => t.contested).length;

  return { territories: uncontested, totalClaimed, disputedCount };
}

export function addTerritory(state: TerritorySystemState, territory: Territory): TerritorySystemState {
  return { ...state, territories: [...state.territories, territory] };
}

export function cede(state: TerritorySystemState, territoryId: string, newControllerId: string): TerritorySystemState {
  const territories = state.territories.map(t =>
    t.id === territoryId ? { ...t, controllerId: newControllerId, contested: false, claimants: [newControllerId] } : t
  );
  return { ...state, territories };
}
