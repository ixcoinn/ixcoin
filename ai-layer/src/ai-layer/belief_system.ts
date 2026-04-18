export interface Belief {
  id: string;
  statement: string;
  confidence: number;
  source: string;
  timestamp: number;
}

export interface BeliefSystemState {
  beliefs: Belief[];
  coreBeliefs: string[];
  contradictions: string[];
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

export function init(id: string): BeliefSystemState {
  return {
    beliefs: [],
    coreBeliefs: [],
    contradictions: [],
  };
}

export function update(ai: AIEntity, world: WorldState, state: BeliefSystemState): BeliefSystemState {
  const existingIds = new Set(state.beliefs.map(b => b.id));
  const newBeliefs: Belief[] = [];

  for (const [key, val] of Object.entries(ai.beliefs)) {
    if (!existingIds.has(key)) {
      newBeliefs.push({ id: key, statement: String(val), confidence: 0.7, source: 'internal', timestamp: world.tick });
    }
  }

  const allBeliefs = [...state.beliefs, ...newBeliefs];
  const contradictions = detectContradictions(allBeliefs);
  const coreBeliefs = allBeliefs.filter(b => b.confidence > 0.9).map(b => b.id);

  return { beliefs: allBeliefs, coreBeliefs, contradictions };
}

function detectContradictions(beliefs: Belief[]): string[] {
  const contradictions: string[] = [];
  for (let i = 0; i < beliefs.length; i++) {
    for (let j = i + 1; j < beliefs.length; j++) {
      const a = beliefs[i];
      const b = beliefs[j];
      if (a && b && a.statement.includes('not') && b.statement === a.statement.replace('not ', '')) {
        contradictions.push(`${a.id} vs ${b.id}`);
      }
    }
  }
  return contradictions;
}

export function addBelief(state: BeliefSystemState, belief: Belief): BeliefSystemState {
  return { ...state, beliefs: [...state.beliefs, belief] };
}
