export interface Legacy {
  id: string;
  creatorId: string;
  type: 'cultural' | 'political' | 'scientific' | 'artistic' | 'economic';
  description: string;
  influence: number;
  duration: number;
  startTick: number;
}

export interface LegacySystemState {
  legacies: Legacy[];
  mostInfluentialId: string | null;
  totalInfluence: number;
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

export function init(id: string): LegacySystemState {
  return {
    legacies: [],
    mostInfluentialId: null,
    totalInfluence: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: LegacySystemState): LegacySystemState {
  const vision = ai.traits['vision'] ?? 0;
  const leadership = ai.traits['leadership'] ?? 0;
  const impact = (vision + leadership) / 2;

  const legacies = state.legacies.map(l => {
    const age = world.tick - l.startTick;
    const decay = 0.001 * age;
    return { ...l, influence: Math.max(0, l.influence - decay) };
  }).filter(l => l.influence > 0.01);

  if (impact > 0.7 && Math.random() < impact * 0.02) {
    const types: Legacy['type'][] = ['cultural', 'political', 'scientific', 'artistic', 'economic'];
    const type = types[Math.floor(Math.random() * types.length)] ?? 'cultural';
    legacies.push({
      id: `leg_${world.tick}`,
      creatorId: ai.id,
      type,
      description: `${ai.id}'s ${type} legacy`,
      influence: impact,
      duration: Math.floor(impact * 1000),
      startTick: world.tick,
    });
  }

  legacies.sort((a, b) => b.influence - a.influence);
  const mostInfluentialId = legacies[0]?.id ?? null;
  const totalInfluence = legacies.reduce((s, l) => s + l.influence, 0);

  return { legacies: legacies.slice(-20), mostInfluentialId, totalInfluence };
}

export function createLegacy(state: LegacySystemState, legacy: Legacy): LegacySystemState {
  return { ...state, legacies: [...state.legacies, legacy] };
}
