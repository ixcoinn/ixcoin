export interface MetaCognitionState {
  thinkingAboutThinking: boolean;
  cognitiveLoad: number;
  selfEvaluationScore: number;
  strategyHistory: string[];
  currentStrategy: string;
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

export function init(id: string): MetaCognitionState {
  return {
    thinkingAboutThinking: false,
    cognitiveLoad: 0,
    selfEvaluationScore: 0.5,
    strategyHistory: [],
    currentStrategy: 'reactive',
  };
}

export function update(ai: AIEntity, world: WorldState, state: MetaCognitionState): MetaCognitionState {
  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const thinkingAboutThinking = intelligence > 0.6 && Math.random() < intelligence * 0.3;
  const cognitiveLoad = Math.min(1, (ai.memory.length ?? 0) * 0.01 + Object.keys(ai.beliefs).length * 0.02);

  const strategies = ['reactive', 'proactive', 'adaptive', 'strategic', 'meta'];
  const strategyIndex = Math.floor(intelligence * (strategies.length - 1));
  const currentStrategy = strategies[strategyIndex] ?? 'reactive';

  const selfEvaluationScore = thinkingAboutThinking
    ? Math.min(1, state.selfEvaluationScore + 0.01)
    : Math.max(0, state.selfEvaluationScore - 0.005);

  const strategyHistory = [...state.strategyHistory.slice(-19), `${world.tick}:${currentStrategy}`];

  return { thinkingAboutThinking, cognitiveLoad, selfEvaluationScore, strategyHistory, currentStrategy };
}

export function evaluateDecision(state: MetaCognitionState, decision: string): number {
  const baseScore = state.selfEvaluationScore;
  const strategyBonus = state.currentStrategy === 'meta' ? 0.2 : 0;
  return Math.min(1, baseScore + strategyBonus);
}
