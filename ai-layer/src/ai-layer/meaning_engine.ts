export interface MeaningSource {
  id: string;
  domain: 'relationships' | 'purpose' | 'achievement' | 'transcendence' | 'legacy';
  contribution: number;
  active: boolean;
}

export interface MeaningEngineState {
  sources: MeaningSource[];
  meaningLevel: number;
  nihilismRisk: number;
  lifeSatisfaction: number;
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

export function init(id: string): MeaningEngineState {
  return {
    sources: [
      { id: 'rel', domain: 'relationships', contribution: 0.3, active: true },
      { id: 'pur', domain: 'purpose', contribution: 0.3, active: true },
      { id: 'ach', domain: 'achievement', contribution: 0.2, active: true },
      { id: 'leg', domain: 'legacy', contribution: 0.2, active: false },
    ],
    meaningLevel: 0.5,
    nihilismRisk: 0.1,
    lifeSatisfaction: 0.5,
  };
}

export function update(ai: AIEntity, world: WorldState, state: MeaningEngineState): MeaningEngineState {
  const social = ai.traits['social'] ?? 0.5;
  const purpose = ai.traits['purpose'] ?? 0.5;
  const achievements = ai.traits['achievements'] ?? 0;

  const sources: MeaningSource[] = [
    { id: 'rel', domain: 'relationships', contribution: social * 0.4, active: social > 0.2 },
    { id: 'pur', domain: 'purpose', contribution: purpose * 0.4, active: purpose > 0.2 },
    { id: 'ach', domain: 'achievement', contribution: achievements * 0.3, active: achievements > 0.1 },
    { id: 'leg', domain: 'legacy', contribution: (ai.traits['legacy'] ?? 0) * 0.3, active: (ai.traits['legacy'] ?? 0) > 0.3 },
  ];

  const activeSources = sources.filter(s => s.active);
  const meaningLevel = activeSources.reduce((s, src) => s + src.contribution, 0) / Math.max(1, activeSources.length);
  const nihilismRisk = Math.max(0, 0.8 - meaningLevel);
  const lifeSatisfaction = (meaningLevel + (1 - nihilismRisk)) / 2;

  return { sources, meaningLevel, nihilismRisk, lifeSatisfaction };
}

export function addMeaningSource(state: MeaningEngineState, source: MeaningSource): MeaningEngineState {
  return { ...state, sources: [...state.sources, source] };
}
