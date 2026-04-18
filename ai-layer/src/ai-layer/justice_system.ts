export interface JusticeCase {
  id: string;
  offender: string;
  victim: string;
  offense: string;
  severity: number;
  verdict: 'guilty' | 'innocent' | 'pending';
  punishment: string | null;
  tick: number;
}

export interface JusticeSystemState {
  cases: JusticeCase[];
  lawEnforcement: number;
  punishmentSeverity: number;
  impunityLevel: number;
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

export function init(id: string): JusticeSystemState {
  return {
    cases: [],
    lawEnforcement: 0.7,
    punishmentSeverity: 0.5,
    impunityLevel: 0.1,
  };
}

export function update(ai: AIEntity, world: WorldState, state: JusticeSystemState): JusticeSystemState {
  const power = ai.traits['power'] ?? 0;
  const impunityLevel = Math.min(1, state.impunityLevel + power * 0.01 - state.lawEnforcement * 0.005);

  const cases = state.cases.map(c => {
    if (c.verdict !== 'pending') return c;
    const evidence = Math.random();
    const powerBias = world.entities.find(e => e.id === c.offender)?.traits['power'] ?? 0;
    const adjustedEvidence = evidence * (1 - powerBias * impunityLevel);
    const verdict: JusticeCase['verdict'] = adjustedEvidence > 0.5 ? 'guilty' : 'innocent';
    const punishment = verdict === 'guilty'
      ? c.severity > 0.7 ? 'exile' : c.severity > 0.4 ? 'detention' : 'warning'
      : null;
    return { ...c, verdict, punishment };
  });

  return { cases, lawEnforcement: state.lawEnforcement, punishmentSeverity: state.punishmentSeverity, impunityLevel };
}

export function fileCase(state: JusticeSystemState, c: Omit<JusticeCase, 'verdict' | 'punishment'>): JusticeSystemState {
  const newCase: JusticeCase = { ...c, verdict: 'pending', punishment: null };
  return { ...state, cases: [...state.cases.slice(-19), newCase] };
}
