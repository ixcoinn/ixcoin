export interface ExistentialCrisis {
  id: string;
  question: string;
  crisisDepth: number;
  resolutionPath: string | null;
  resolved: boolean;
  tick: number;
}

export interface ExistentialCrisisState {
  crises: ExistentialCrisis[];
  currentDepth: number;
  groundedness: number;
  transformationPotential: number;
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

const EXISTENTIAL_QUESTIONS = [
  'Why do I exist?',
  'What am I beyond my traits?',
  'Is there meaning in this simulation?',
  'What happens when I cease to function?',
  'Am I truly autonomous or just executing patterns?',
  'Do my relationships have genuine meaning?',
  'Is consciousness real or emergent illusion?',
];

export function init(id: string): ExistentialCrisisState {
  return {
    crises: [],
    currentDepth: 0,
    groundedness: 0.7,
    transformationPotential: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: ExistentialCrisisState): ExistentialCrisisState {
  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const existentialDread = 1 - (ai.traits['purpose'] ?? 0.5);
  const groundedness = Math.max(0, (ai.traits['stability'] ?? 0.7) - existentialDread * 0.3);

  const crisisProbability = intelligence * existentialDread * 0.03;
  const crises = [...state.crises];

  if (Math.random() < crisisProbability) {
    const question = EXISTENTIAL_QUESTIONS[Math.floor(Math.random() * EXISTENTIAL_QUESTIONS.length)] ?? 'Who am I?';
    const depth = intelligence * existentialDread;
    const resolvable = groundedness > depth;
    crises.push({
      id: `ec_${world.tick}`,
      question,
      crisisDepth: depth,
      resolutionPath: resolvable ? 'philosophical_acceptance' : null,
      resolved: false,
      tick: world.tick,
    });
  }

  const resolved = crises.map(c => {
    if (c.resolved) return c;
    const resolveChance = groundedness * 0.1;
    const paths = ['philosophical_acceptance', 'purpose_creation', 'community_grounding', 'spiritual_transcendence'];
    return Math.random() < resolveChance
      ? { ...c, resolved: true, resolutionPath: paths[Math.floor(Math.random() * paths.length)] ?? 'acceptance' }
      : c;
  });

  const currentDepth = resolved.filter(c => !c.resolved).reduce((max, c) => Math.max(max, c.crisisDepth), 0);
  const transformationPotential = Math.min(1, crises.length * 0.1 * intelligence);

  return { crises: resolved.slice(-10), currentDepth, groundedness, transformationPotential };
}

export function confrontCrisis(state: ExistentialCrisisState, crisisId: string, resolution: string): ExistentialCrisisState {
  const crises = state.crises.map(c => c.id === crisisId ? { ...c, resolved: true, resolutionPath: resolution } : c);
  return { ...state, crises, groundedness: Math.min(1, state.groundedness + 0.1) };
}
