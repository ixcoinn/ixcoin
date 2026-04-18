export interface MoralDecision {
  id: string;
  dilemma: string;
  chosenPath: 'moral' | 'immoral' | 'neutral';
  moralScore: number;
  tick: number;
}

export interface MoralityEngineState {
  decisions: MoralDecision[];
  moralScore: number;
  moralFramework: 'utilitarian' | 'deontological' | 'virtue' | 'nihilistic';
  corruption: number;
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

export function init(id: string): MoralityEngineState {
  return {
    decisions: [],
    moralScore: 0.5,
    moralFramework: 'virtue',
    corruption: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: MoralityEngineState): MoralityEngineState {
  const empathy = ai.traits['empathy'] ?? 0.5;
  const power = ai.traits['power'] ?? 0;
  const stress = ai.traits['stress'] ?? 0;

  const frameworks: MoralityEngineState['moralFramework'][] = ['utilitarian', 'deontological', 'virtue', 'nihilistic'];
  const frameworkIndex = Math.floor((1 - empathy + power) * 2) % frameworks.length;
  const moralFramework = frameworks[frameworkIndex] ?? 'virtue';

  const corruption = Math.min(1, state.corruption + (power * stress * 0.01) - empathy * 0.005);
  const moralScore = Math.max(0, Math.min(1, empathy * (1 - corruption) + state.moralScore * 0.5));

  const decisions = [...state.decisions];
  if (Math.random() < 0.1) {
    const dilemmas = ['Help or ignore?', 'Truth or comfort?', 'Self or others?', 'Rules or outcomes?'];
    const d: MoralDecision = {
      id: `md_${world.tick}`,
      dilemma: dilemmas[Math.floor(Math.random() * dilemmas.length)] ?? 'Undefined dilemma',
      chosenPath: moralScore > 0.5 ? 'moral' : moralScore < 0.3 ? 'immoral' : 'neutral',
      moralScore,
      tick: world.tick,
    };
    decisions.push(d);
  }

  return { decisions: decisions.slice(-20), moralScore, moralFramework, corruption };
}

export function judgeAction(state: MoralityEngineState, action: string): string {
  if (state.moralScore > 0.7) return `${action} is virtuous`;
  if (state.moralScore < 0.3) return `${action} is condemned`;
  return `${action} is ambiguous`;
}
