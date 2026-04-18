export interface DestinyPath {
  id: string;
  description: string;
  probability: number;
  requiredTraits: Record<string, number>;
  fulfilled: boolean;
  milestones: string[];
}

export interface DestinyEngineState {
  paths: DestinyPath[];
  activePath: string | null;
  fateScore: number;
  fulfillmentProgress: number;
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

export function init(id: string): DestinyEngineState {
  const paths: DestinyPath[] = [
    { id: 'hero', description: 'Become a beacon of hope', probability: 0.1, requiredTraits: { courage: 0.7, empathy: 0.6 }, fulfilled: false, milestones: [] },
    { id: 'villain', description: 'Seize control through fear', probability: 0.1, requiredTraits: { cunning: 0.7, aggression: 0.6 }, fulfilled: false, milestones: [] },
    { id: 'sage', description: 'Accumulate and share wisdom', probability: 0.15, requiredTraits: { intelligence: 0.8, wisdom: 0.7 }, fulfilled: false, milestones: [] },
    { id: 'builder', description: 'Create lasting structures', probability: 0.2, requiredTraits: { discipline: 0.6, creativity: 0.5 }, fulfilled: false, milestones: [] },
    { id: 'wanderer', description: 'Experience all possibilities', probability: 0.25, requiredTraits: { curiosity: 0.7 }, fulfilled: false, milestones: [] },
  ];
  return { paths, activePath: null, fateScore: 0.5, fulfillmentProgress: 0 };
}

export function update(ai: AIEntity, world: WorldState, state: DestinyEngineState): DestinyEngineState {
  const fateVsFreeWill = ai.traits['fatalism'] ?? 0.3;

  let activePath = state.activePath;
  if (!activePath) {
    const eligible = state.paths.filter(p =>
      Object.entries(p.requiredTraits).every(([t, req]) => (ai.traits[t] ?? 0) >= req * 0.7)
    );
    eligible.sort((a, b) => b.probability - a.probability);
    activePath = eligible[0]?.id ?? null;
  }

  const paths = state.paths.map(p => {
    if (p.id !== activePath) return p;
    const progress = Object.entries(p.requiredTraits).reduce((s, [t, req]) => {
      return s + Math.min(1, (ai.traits[t] ?? 0) / req);
    }, 0) / Math.max(1, Object.keys(p.requiredTraits).length);
    const fulfilled = progress >= 1;
    return { ...p, fulfilled, milestones: progress > 0.5 && !p.milestones.includes('halfway') ? [...p.milestones, 'halfway'] : p.milestones };
  });

  const activeDest = paths.find(p => p.id === activePath);
  const fulfillmentProgress = activeDest ? Object.entries(activeDest.requiredTraits).reduce((s, [t, req]) => {
    return s + Math.min(1, (ai.traits[t] ?? 0) / req);
  }, 0) / Math.max(1, Object.keys(activeDest.requiredTraits).length) : 0;

  return { paths, activePath, fateScore: fateVsFreeWill, fulfillmentProgress };
}

export function choosePath(state: DestinyEngineState, pathId: string): DestinyEngineState {
  return { ...state, activePath: pathId };
}
