export interface TimeLoop {
  id: string;
  startTick: number;
  endTick: number;
  iterationCount: number;
  escapeCondition: string;
  escaped: boolean;
}

export interface TimeLoopEngineState {
  activeLoop: TimeLoop | null;
  completedLoops: TimeLoop[];
  totalIterations: number;
  deltaRetentions: Record<string, number>;
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

export function init(id: string): TimeLoopEngineState {
  return {
    activeLoop: null,
    completedLoops: [],
    totalIterations: 0,
    deltaRetentions: {},
  };
}

export function update(ai: AIEntity, world: WorldState, state: TimeLoopEngineState): [AIEntity, TimeLoopEngineState] {
  let activeLoop = state.activeLoop;
  let totalIterations = state.totalIterations;
  const completedLoops = [...state.completedLoops];
  const deltaRetentions = { ...state.deltaRetentions };

  if (!activeLoop) return [ai, state];

  if (world.tick >= activeLoop.endTick) {
    const intelligence = ai.traits['intelligence'] ?? 0.5;
    const memory = ai.traits['memory'] ?? 0.5;
    const escapeChance = intelligence * memory * (activeLoop.iterationCount / 100);
    const escaped = Math.random() < escapeChance || activeLoop.iterationCount > 50;

    if (escaped) {
      completedLoops.push({ ...activeLoop, escaped: true });
      deltaRetentions[ai.id] = Math.min(1, (deltaRetentions[ai.id] ?? 0) + intelligence * 0.1);
      return [ai, { ...state, activeLoop: null, completedLoops, totalIterations, deltaRetentions }];
    }

    activeLoop = { ...activeLoop, iterationCount: activeLoop.iterationCount + 1 };
    totalIterations++;
  }

  return [ai, { ...state, activeLoop, completedLoops, totalIterations, deltaRetentions }];
}

export function enterLoop(state: TimeLoopEngineState, startTick: number, endTick: number): TimeLoopEngineState {
  const loop: TimeLoop = {
    id: `loop_${startTick}`,
    startTick,
    endTick,
    iterationCount: 1,
    escapeCondition: 'learn_pattern',
    escaped: false,
  };
  return { ...state, activeLoop: loop, totalIterations: state.totalIterations + 1 };
}
