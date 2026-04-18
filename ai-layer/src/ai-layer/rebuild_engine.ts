export interface RebuildPhase {
  id: string;
  name: string;
  progress: number;
  required: string[];
  completed: boolean;
  tick: number;
}

export interface RebuildEngineState {
  phases: RebuildPhase[];
  rebuildProgress: number;
  rebuilderIds: string[];
  momentum: number;
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

export function init(id: string): RebuildEngineState {
  return {
    phases: [],
    rebuildProgress: 0,
    rebuilderIds: [],
    momentum: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: RebuildEngineState): RebuildEngineState {
  const discipline = ai.traits['discipline'] ?? 0.5;
  const hope = ai.traits['hope'] ?? 0.5;
  const leadership = ai.traits['leadership'] ?? 0.3;

  const momentum = Math.min(1, state.momentum + (discipline + hope + leadership) / 3 * 0.01);

  const phases = state.phases.map(phase => {
    if (phase.completed) return phase;
    const progress = Math.min(1, phase.progress + momentum * 0.05);
    return { ...phase, progress, completed: progress >= 1 };
  });

  const completedPhases = phases.filter(p => p.completed).length;
  const rebuildProgress = phases.length > 0 ? completedPhases / phases.length : 0;

  const rebuilderIds = state.rebuilderIds.includes(ai.id) ? state.rebuilderIds : [...state.rebuilderIds, ai.id];

  if (phases.length === 0) {
    const defaultPhases: RebuildPhase[] = [
      { id: 'r1', name: 'stabilize', progress: 0, required: [], completed: false, tick: world.tick },
      { id: 'r2', name: 'organize', progress: 0, required: ['r1'], completed: false, tick: world.tick },
      { id: 'r3', name: 'grow', progress: 0, required: ['r2'], completed: false, tick: world.tick },
    ];
    return { phases: defaultPhases, rebuildProgress: 0, rebuilderIds, momentum };
  }

  return { phases, rebuildProgress, rebuilderIds, momentum };
}

export function startRebuild(state: RebuildEngineState, initiatorId: string): RebuildEngineState {
  return { ...state, rebuilderIds: [...state.rebuilderIds, initiatorId], momentum: 0.1 };
}
