export interface FeedbackSignal {
  id: string;
  type: 'positive' | 'negative';
  source: string;
  magnitude: number;
  tick: number;
}

export interface FeedbackLoopState {
  signals: FeedbackSignal[];
  loopGain: number;
  oscillating: boolean;
  equilibriumValue: number;
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

export function init(id: string): FeedbackLoopState {
  return {
    signals: [],
    loopGain: 1,
    oscillating: false,
    equilibriumValue: 0.5,
  };
}

export function update(ai: AIEntity, world: WorldState, state: FeedbackLoopState): [AIEntity, FeedbackLoopState] {
  const learning = ai.traits['learning'] ?? 0.5;
  const recentSignals = state.signals.slice(-5);
  const netFeedback = recentSignals.reduce((s, sig) =>
    s + (sig.type === 'positive' ? sig.magnitude : -sig.magnitude), 0);

  const newTraits = { ...ai.traits };
  if (netFeedback > 0) {
    for (const [trait, value] of Object.entries(newTraits)) {
      if (value > state.equilibriumValue) {
        newTraits[trait] = Math.min(1, value + netFeedback * learning * 0.01);
      }
    }
  } else if (netFeedback < 0) {
    for (const [trait, value] of Object.entries(newTraits)) {
      if (value > state.equilibriumValue) {
        newTraits[trait] = Math.max(0, value + netFeedback * learning * 0.01);
      }
    }
  }

  const oscillating = recentSignals.length >= 4 &&
    recentSignals.filter(s => s.type === 'positive').length === 2 &&
    recentSignals.filter(s => s.type === 'negative').length === 2;

  const loopGain = Math.min(2, Math.max(0.1, state.loopGain + Math.abs(netFeedback) * 0.01));

  return [{ ...ai, traits: newTraits }, { ...state, loopGain, oscillating }];
}

export function addSignal(state: FeedbackLoopState, signal: FeedbackSignal): FeedbackLoopState {
  return { ...state, signals: [...state.signals.slice(-19), signal] };
}
