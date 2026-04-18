export interface SatisfactionRecord {
  source: string;
  delta: number;
  tick: number;
}

export interface SatisfactionEngineState {
  satisfactionLevel: number;
  hedonicBaseline: number;
  records: SatisfactionRecord[];
  dissatisfactionSources: string[];
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

export function init(id: string): SatisfactionEngineState {
  return {
    satisfactionLevel: 0.5,
    hedonicBaseline: 0.5,
    records: [],
    dissatisfactionSources: [],
  };
}

export function update(ai: AIEntity, world: WorldState, state: SatisfactionEngineState): SatisfactionEngineState {
  const needs = ['health', 'social', 'purpose', 'security', 'esteem'];
  let totalDelta = 0;
  const dissatisfactionSources: string[] = [];

  for (const need of needs) {
    const value = ai.traits[need] ?? 0.5;
    const delta = (value - state.hedonicBaseline) * 0.1;
    totalDelta += delta;
    if (value < 0.3) dissatisfactionSources.push(need);
  }

  const satisfactionLevel = Math.max(0, Math.min(1, state.satisfactionLevel + totalDelta));
  const hedonicAdaptation = 0.001;
  const hedonicBaseline = state.hedonicBaseline + (satisfactionLevel - state.hedonicBaseline) * hedonicAdaptation;

  const records: SatisfactionRecord[] = [...state.records.slice(-19), {
    source: 'needs_assessment',
    delta: totalDelta,
    tick: world.tick,
  }];

  return { satisfactionLevel, hedonicBaseline, records, dissatisfactionSources };
}

export function applySatisfaction(state: SatisfactionEngineState, source: string, delta: number): SatisfactionEngineState {
  const satisfactionLevel = Math.max(0, Math.min(1, state.satisfactionLevel + delta));
  const records = [...state.records, { source, delta, tick: Date.now() }];
  return { ...state, satisfactionLevel, records: records.slice(-20) };
}
