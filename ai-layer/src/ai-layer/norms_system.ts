export interface SocialNorm {
  id: string;
  description: string;
  type: 'prescriptive' | 'proscriptive' | 'descriptive';
  compliance: number;
  enforced: boolean;
  violationsCount: number;
}

export interface NormsSystemState {
  norms: SocialNorm[];
  overallCompliance: number;
  normErosion: number;
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

export function init(id: string): NormsSystemState {
  return {
    norms: [],
    overallCompliance: 0.8,
    normErosion: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: NormsSystemState): NormsSystemState {
  const conformity = ai.traits['conformity'] ?? 0.5;
  const rebelliousness = ai.traits['rebelliousness'] ?? 0.2;

  const norms = state.norms.map(norm => {
    const willComply = Math.random() < conformity - rebelliousness;
    const violationsCount = willComply ? norm.violationsCount : norm.violationsCount + 1;
    const compliance = Math.max(0, norm.compliance - (willComply ? -0.01 : 0.02));
    return { ...norm, compliance, violationsCount };
  });

  const overallCompliance = norms.length > 0
    ? norms.reduce((s, n) => s + n.compliance, 0) / norms.length
    : 0.8;

  const normErosion = Math.min(1, norms.reduce((s, n) => s + (1 - n.compliance) * 0.1, 0));

  return { norms, overallCompliance, normErosion };
}

export function addNorm(state: NormsSystemState, norm: SocialNorm): NormsSystemState {
  return { ...state, norms: [...state.norms, norm] };
}

export function violateNorm(state: NormsSystemState, normId: string): NormsSystemState {
  const norms = state.norms.map(n => n.id === normId
    ? { ...n, violationsCount: n.violationsCount + 1, compliance: Math.max(0, n.compliance - 0.05) }
    : n);
  return { ...state, norms };
}
