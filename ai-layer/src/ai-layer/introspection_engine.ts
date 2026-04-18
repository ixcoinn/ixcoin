export interface IntrospectionResult {
  tick: number;
  observations: string[];
  patterns: string[];
  insights: string[];
}

export interface IntrospectionEngineState {
  results: IntrospectionResult[];
  introspectionFrequency: number;
  depthLevel: number;
  lastIntrospectionTick: number;
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

export function init(id: string): IntrospectionEngineState {
  return {
    results: [],
    introspectionFrequency: 10,
    depthLevel: 1,
    lastIntrospectionTick: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: IntrospectionEngineState): IntrospectionEngineState {
  const timeSinceLast = world.tick - state.lastIntrospectionTick;
  if (timeSinceLast < state.introspectionFrequency) return state;

  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const observations = Object.entries(ai.traits)
    .map(([k, v]) => `${k}=${v.toFixed(2)}`);

  const patterns: string[] = [];
  const highTraits = Object.entries(ai.traits).filter(([, v]) => v > 0.7).map(([k]) => k);
  const lowTraits = Object.entries(ai.traits).filter(([, v]) => v < 0.3).map(([k]) => k);
  if (highTraits.length > 0) patterns.push(`Strong in: ${highTraits.join(', ')}`);
  if (lowTraits.length > 0) patterns.push(`Weak in: ${lowTraits.join(', ')}`);

  const insights: string[] = [];
  if (intelligence > 0.6) {
    insights.push(`Self-correction opportunity in: ${lowTraits.slice(0, 2).join(', ')}`);
  }

  const result: IntrospectionResult = { tick: world.tick, observations, patterns, insights };
  const depthLevel = Math.min(5, Math.floor(intelligence * 5));

  return {
    results: [...state.results.slice(-9), result],
    introspectionFrequency: Math.max(5, 10 - depthLevel),
    depthLevel,
    lastIntrospectionTick: world.tick,
  };
}

export function getLatestInsights(state: IntrospectionEngineState): string[] {
  return state.results.at(-1)?.insights ?? [];
}
