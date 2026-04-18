export interface MentorRelationship {
  mentorId: string;
  menteeId: string;
  transferredTraits: string[];
  sessionsCompleted: number;
  bondStrength: number;
  startTick: number;
}

export interface MentorSystemState {
  relationships: MentorRelationship[];
  mentorPool: string[];
  menteePool: string[];
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

export function init(id: string): MentorSystemState {
  return {
    relationships: [],
    mentorPool: [],
    menteePool: [],
  };
}

export function update(ai: AIEntity, world: WorldState, state: MentorSystemState): [AIEntity, MentorSystemState] {
  const wisdom = ai.traits['wisdom'] ?? 0;
  const teachability = ai.traits['teachability'] ?? 0.5;
  let newTraits = { ...ai.traits };

  const mentorRels = state.relationships.filter(r => r.menteeId === ai.id);
  for (const rel of mentorRels) {
    const mentor = world.entities.find(e => e.id === rel.mentorId);
    if (!mentor) continue;
    for (const [trait, value] of Object.entries(mentor.traits)) {
      const current = newTraits[trait] ?? 0;
      if (value > current) {
        const transfer = (value - current) * teachability * rel.bondStrength * 0.05;
        newTraits[trait] = Math.min(1, current + transfer);
      }
    }
  }

  const relationships = state.relationships.map(rel => {
    if (rel.mentorId === ai.id || rel.menteeId === ai.id) {
      return {
        ...rel,
        sessionsCompleted: rel.sessionsCompleted + 1,
        bondStrength: Math.min(1, rel.bondStrength + 0.01 * wisdom),
      };
    }
    return rel;
  });

  return [{ ...ai, traits: newTraits }, { ...state, relationships }];
}

export function formMentorship(state: MentorSystemState, mentorId: string, menteeId: string, tick: number): MentorSystemState {
  const rel: MentorRelationship = {
    mentorId,
    menteeId,
    transferredTraits: [],
    sessionsCompleted: 0,
    bondStrength: 0.3,
    startTick: tick,
  };
  return { ...state, relationships: [...state.relationships, rel] };
}
