export interface War {
  id: string;
  aggressorId: string;
  defenderId: string;
  cause: string;
  phase: 'declaration' | 'skirmish' | 'full_conflict' | 'stalemate' | 'ended';
  aggressorStrength: number;
  defenderStrength: number;
  casualties: number;
  tick: number;
}

export interface WarEngineState {
  wars: War[];
  globalConflictLevel: number;
  peacePeriod: number;
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

export function init(id: string): WarEngineState {
  return {
    wars: [],
    globalConflictLevel: 0,
    peacePeriod: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: WarEngineState): WarEngineState {
  const aggression = ai.traits['aggression'] ?? 0;
  const military = ai.traits['military'] ?? 0;
  const grievance = ai.traits['grievance'] ?? 0;

  const wars = state.wars.map(war => {
    if (war.phase === 'ended') return war;
    const aggStrength = world.entities.find(e => e.id === war.aggressorId)?.traits['military'] ?? war.aggressorStrength;
    const defStrength = world.entities.find(e => e.id === war.defenderId)?.traits['military'] ?? war.defenderStrength;
    const strDelta = Math.abs(aggStrength - defStrength);
    const casualties = war.casualties + Math.floor(Math.random() * 10 * (aggStrength + defStrength));
    let phase = war.phase;
    if (strDelta > 0.5 && war.phase === 'full_conflict') phase = 'ended';
    else if (war.phase === 'skirmish') phase = 'full_conflict';
    return { ...war, aggressorStrength: aggStrength, defenderStrength: defStrength, casualties, phase };
  });

  let peacePeriod = state.peacePeriod;
  if (aggression + grievance > 0.8 && Math.random() < 0.05 && world.entities.length > 1) {
    const target = world.entities.find(e => e.id !== ai.id);
    if (target) {
      const war: War = {
        id: `war_${world.tick}`,
        aggressorId: ai.id,
        defenderId: target.id,
        cause: grievance > 0.5 ? 'grievance' : 'expansion',
        phase: 'declaration',
        aggressorStrength: military,
        defenderStrength: target.traits['military'] ?? 0,
        casualties: 0,
        tick: world.tick,
      };
      wars.push(war);
      peacePeriod = 0;
    }
  } else {
    peacePeriod++;
  }

  const activeWars = wars.filter(w => w.phase !== 'ended').length;
  const globalConflictLevel = Math.min(1, activeWars * 0.2);

  return { wars: wars.slice(-10), globalConflictLevel, peacePeriod };
}

export function declareWar(state: WarEngineState, aggressorId: string, defenderId: string, cause: string, tick: number): WarEngineState {
  const war: War = { id: `war_${tick}`, aggressorId, defenderId, cause, phase: 'declaration', aggressorStrength: 0.5, defenderStrength: 0.5, casualties: 0, tick };
  return { ...state, wars: [...state.wars, war], globalConflictLevel: Math.min(1, state.globalConflictLevel + 0.2) };
}
