export interface UrgencySignal {
  id: string;
  source: string;
  level: number;
  deadline: number | null;
  resolved: boolean;
  tick: number;
}

export interface UrgencyEngineState {
  signals: UrgencySignal[];
  overallUrgency: number;
  panicMode: boolean;
  urgencyThreshold: number;
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

export function init(id: string): UrgencyEngineState {
  return {
    signals: [],
    overallUrgency: 0,
    panicMode: false,
    urgencyThreshold: 0.8,
  };
}

export function update(ai: AIEntity, world: WorldState, state: UrgencyEngineState): [AIEntity, UrgencyEngineState] {
  const threats = world.entities.filter(e => (e.traits['aggression'] ?? 0) > 0.6 && e.id !== ai.id).length;
  const health = ai.traits['health'] ?? 1;

  const signals = state.signals.map(s => {
    if (s.deadline !== null && world.tick >= s.deadline) return { ...s, resolved: true };
    const timeLeft = s.deadline ? s.deadline - world.tick : 100;
    return { ...s, level: Math.min(1, s.level + (100 / Math.max(1, timeLeft)) * 0.01) };
  }).filter(s => !s.resolved);

  if (threats > 0) {
    signals.push({ id: `urg_${world.tick}`, source: 'threat', level: threats * 0.3, deadline: world.tick + 10, resolved: false, tick: world.tick });
  }
  if (health < 0.3) {
    signals.push({ id: `urg_health_${world.tick}`, source: 'health', level: 1 - health, deadline: null, resolved: false, tick: world.tick });
  }

  const overallUrgency = signals.reduce((max, s) => Math.max(max, s.level), 0);
  const panicMode = overallUrgency > state.urgencyThreshold;

  const newTraits = { ...ai.traits };
  if (panicMode) newTraits['stress'] = Math.min(1, (newTraits['stress'] ?? 0) + 0.1);

  return [{ ...ai, traits: newTraits }, { signals: signals.slice(-10), overallUrgency, panicMode, urgencyThreshold: state.urgencyThreshold }];
}

export function resolveUrgency(state: UrgencyEngineState, signalId: string): UrgencyEngineState {
  const signals = state.signals.map(s => s.id === signalId ? { ...s, resolved: true } : s).filter(s => !s.resolved);
  const overallUrgency = signals.reduce((max, s) => Math.max(max, s.level), 0);
  return { ...state, signals, overallUrgency, panicMode: overallUrgency > state.urgencyThreshold };
}
