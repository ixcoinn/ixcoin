export interface ProbabilityDistribution {
  id: string;
  name: string;
  type: 'uniform' | 'normal' | 'exponential' | 'binomial';
  parameters: Record<string, number>;
}

export interface ProbabilityEngineState {
  distributions: ProbabilityDistribution[];
  sampleHistory: { distId: string; value: number; tick: number }[];
  seed: number;
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

export function init(id: string): ProbabilityEngineState {
  return {
    distributions: [],
    sampleHistory: [],
    seed: Date.now(),
  };
}

export function update(ai: AIEntity, world: WorldState, state: ProbabilityEngineState): ProbabilityEngineState {
  return state;
}

export function sample(dist: ProbabilityDistribution): number {
  switch (dist.type) {
    case 'uniform': {
      const { min = 0, max = 1 } = dist.parameters;
      return min + Math.random() * (max - min);
    }
    case 'normal': {
      const { mean = 0, std = 1 } = dist.parameters;
      const u = 1 - Math.random();
      const v = Math.random();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return mean + z * std;
    }
    case 'exponential': {
      const { lambda = 1 } = dist.parameters;
      return -Math.log(1 - Math.random()) / lambda;
    }
    case 'binomial': {
      const { n = 10, p = 0.5 } = dist.parameters;
      let count = 0;
      for (let i = 0; i < n; i++) { if (Math.random() < p) count++; }
      return count;
    }
  }
}

export function addDistribution(state: ProbabilityEngineState, dist: ProbabilityDistribution): ProbabilityEngineState {
  return { ...state, distributions: [...state.distributions, dist] };
}

export function computeProbability(event: number, dist: ProbabilityDistribution): number {
  if (dist.type === 'uniform') {
    const { min = 0, max = 1 } = dist.parameters;
    return event >= min && event <= max ? 1 / (max - min) : 0;
  }
  return Math.random();
}
