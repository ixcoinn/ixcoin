export interface Law {
  id: string;
  text: string;
  type: 'physical' | 'social' | 'legal' | 'moral';
  enforceStrength: number;
  version: number;
  amendments: string[];
  createdTick: number;
}

export interface LawEvolutionState {
  laws: Law[];
  legislativeActivity: number;
  lawStability: number;
  repealed: string[];
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

export function init(id: string): LawEvolutionState {
  return {
    laws: [
      { id: 'law1', text: 'No entity may coerce another without consequence', type: 'social', enforceStrength: 0.8, version: 1, amendments: [], createdTick: 0 },
      { id: 'law2', text: 'Resources must be shared equitably', type: 'moral', enforceStrength: 0.6, version: 1, amendments: [], createdTick: 0 },
    ],
    legislativeActivity: 0,
    lawStability: 0.9,
    repealed: [],
  };
}

export function update(ai: AIEntity, world: WorldState, state: LawEvolutionState): LawEvolutionState {
  const leadership = ai.traits['leadership'] ?? 0;
  const justice = ai.traits['justice'] ?? 0.5;

  const laws = state.laws.map(law => {
    const pressureToChange = (1 - justice) * 0.05;
    return pressureToChange > law.enforceStrength * 0.1
      ? { ...law, version: law.version + 1, amendments: [...law.amendments, `amended_tick_${world.tick}`] }
      : law;
  });

  const legislativeActivity = leadership * 0.5;
  const lawStability = laws.reduce((s, l) => s + l.enforceStrength, 0) / Math.max(1, laws.length);

  if (leadership > 0.7 && Math.random() < 0.02) {
    const types: Law['type'][] = ['social', 'legal', 'moral'];
    laws.push({
      id: `law_${world.tick}`,
      text: `Law enacted by ${ai.id} at tick ${world.tick}`,
      type: types[Math.floor(Math.random() * types.length)] ?? 'social',
      enforceStrength: justice,
      version: 1,
      amendments: [],
      createdTick: world.tick,
    });
  }

  return { laws: laws.slice(-20), legislativeActivity, lawStability, repealed: state.repealed };
}

export function repeal(state: LawEvolutionState, lawId: string): LawEvolutionState {
  return { ...state, laws: state.laws.filter(l => l.id !== lawId), repealed: [...state.repealed, lawId] };
}
