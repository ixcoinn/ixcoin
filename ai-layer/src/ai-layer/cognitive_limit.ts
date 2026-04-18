export interface CognitiveLimitState {
  workingMemoryCapacity: number;
  processingSpeed: number;
  overloadThreshold: number;
  currentLoad: number;
  isOverloaded: boolean;
  degradedFunctions: string[];
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

export function init(id: string): CognitiveLimitState {
  return {
    workingMemoryCapacity: 7,
    processingSpeed: 1,
    overloadThreshold: 0.8,
    currentLoad: 0,
    isOverloaded: false,
    degradedFunctions: [],
  };
}

export function update(ai: AIEntity, world: WorldState, state: CognitiveLimitState): [AIEntity, CognitiveLimitState] {
  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const stress = ai.traits['stress'] ?? 0;
  const workingMemoryCapacity = Math.max(3, Math.floor(intelligence * 9));
  const processingSpeed = Math.max(0.1, intelligence * (1 - stress * 0.5));

  const informationLoad = world.entities.length * 0.1 + Object.keys(ai.beliefs).length * 0.05;
  const currentLoad = Math.min(1, informationLoad / workingMemoryCapacity);
  const isOverloaded = currentLoad > state.overloadThreshold;

  const degradedFunctions: string[] = [];
  const newTraits = { ...ai.traits };

  if (isOverloaded) {
    degradedFunctions.push('decision_making', 'emotional_regulation', 'memory_consolidation');
    newTraits['decision_quality'] = Math.max(0, (newTraits['decision_quality'] ?? 0.7) - 0.1);
  }

  return [
    { ...ai, traits: newTraits },
    { workingMemoryCapacity, processingSpeed, overloadThreshold: state.overloadThreshold, currentLoad, isOverloaded, degradedFunctions },
  ];
}

export function expandCapacity(state: CognitiveLimitState, amount: number): CognitiveLimitState {
  return { ...state, workingMemoryCapacity: state.workingMemoryCapacity + amount };
}
