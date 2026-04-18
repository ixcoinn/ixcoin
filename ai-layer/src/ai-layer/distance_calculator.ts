export interface DistanceResult {
  from: { x: number; y: number };
  to: { x: number; y: number };
  euclidean: number;
  manhattan: number;
  chebyshev: number;
}

export interface DistanceCalculatorState {
  cache: Record<string, DistanceResult>;
  calculationCount: number;
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

export function init(id: string): DistanceCalculatorState {
  return {
    cache: {},
    calculationCount: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: DistanceCalculatorState): DistanceCalculatorState {
  return state;
}

export function calculate(from: { x: number; y: number }, to: { x: number; y: number }, state: DistanceCalculatorState): [DistanceResult, DistanceCalculatorState] {
  const key = `${from.x},${from.y}-${to.x},${to.y}`;
  if (state.cache[key]) return [state.cache[key]!, state];

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const result: DistanceResult = {
    from,
    to,
    euclidean: Math.sqrt(dx * dx + dy * dy),
    manhattan: Math.abs(dx) + Math.abs(dy),
    chebyshev: Math.max(Math.abs(dx), Math.abs(dy)),
  };

  const cache = { ...state.cache, [key]: result };
  return [result, { cache, calculationCount: state.calculationCount + 1 }];
}

export function getNearestEntity(entities: { id: string; x: number; y: number }[], origin: { x: number; y: number }): { id: string; x: number; y: number } | null {
  if (entities.length === 0) return null;
  return entities.reduce((nearest, entity) => {
    const d1 = Math.sqrt(Math.pow(entity.x - origin.x, 2) + Math.pow(entity.y - origin.y, 2));
    const d2 = Math.sqrt(Math.pow(nearest.x - origin.x, 2) + Math.pow(nearest.y - origin.y, 2));
    return d1 < d2 ? entity : nearest;
  });
}
