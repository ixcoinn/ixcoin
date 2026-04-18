export interface Paradox {
  id: string;
  type: 'logical' | 'temporal' | 'physical' | 'existential' | 'social';
  description: string;
  resolved: boolean;
  resolutionMethod: string | null;
  tick: number;
}

export interface ParadoxEngineState {
  paradoxes: Paradox[];
  paradoxCount: number;
  systemCoherence: number;
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

const PARADOX_TEMPLATES: Record<Paradox['type'], string[]> = {
  logical: ['This statement is false', 'The set of all sets that do not contain themselves'],
  temporal: ['Killing your past self', 'Receiving information from the future'],
  physical: ['Unstoppable force meets immovable object', 'Infinite energy in finite space'],
  existential: ['Why is there something rather than nothing', 'What is the purpose of purpose'],
  social: ['The prisoner\'s dilemma with infinite stakes', 'Perfect equality vs perfect freedom'],
};

export function init(id: string): ParadoxEngineState {
  return {
    paradoxes: [],
    paradoxCount: 0,
    systemCoherence: 1,
  };
}

export function update(ai: AIEntity, world: WorldState, state: ParadoxEngineState): ParadoxEngineState {
  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const creativity = ai.traits['creativity'] ?? 0.3;
  const paradoxProbability = creativity * (1 - intelligence * 0.5) * 0.02;

  const paradoxes = [...state.paradoxes];
  if (Math.random() < paradoxProbability) {
    const types: Paradox['type'][] = ['logical', 'temporal', 'physical', 'existential', 'social'];
    const type = types[Math.floor(Math.random() * types.length)] ?? 'logical';
    const templates = PARADOX_TEMPLATES[type];
    paradoxes.push({
      id: `par_${world.tick}`,
      type,
      description: templates[Math.floor(Math.random() * templates.length)] ?? 'Unknown paradox',
      resolved: false,
      resolutionMethod: null,
      tick: world.tick,
    });
  }

  const resolved = paradoxes.map(p => {
    if (p.resolved) return p;
    const resolveChance = intelligence * 0.05;
    const methods = ['dissolution', 'acceptance', 'transcendence', 'reframing'];
    return Math.random() < resolveChance
      ? { ...p, resolved: true, resolutionMethod: methods[Math.floor(Math.random() * methods.length)] ?? 'dissolution' }
      : p;
  });

  const unresolvedCount = resolved.filter(p => !p.resolved).length;
  const systemCoherence = Math.max(0, 1 - unresolvedCount * 0.1);

  return { paradoxes: resolved.slice(-15), paradoxCount: resolved.length, systemCoherence };
}

export function resolveParadox(state: ParadoxEngineState, paradoxId: string, method: string): ParadoxEngineState {
  const paradoxes = state.paradoxes.map(p => p.id === paradoxId ? { ...p, resolved: true, resolutionMethod: method } : p);
  return { ...state, paradoxes };
}
