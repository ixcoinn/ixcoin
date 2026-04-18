export interface ParallelWorld {
  id: string;
  divergencePoint: number;
  divergenceCause: string;
  worldState: Partial<WorldState>;
  similarity: number;
}

export interface ParallelWorldsState {
  worlds: ParallelWorld[];
  currentWorldId: string;
  branchingProbability: number;
  collapseCount: number;
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

export function init(id: string): ParallelWorldsState {
  return {
    worlds: [{ id: 'prime', divergencePoint: 0, divergenceCause: 'origin', worldState: {}, similarity: 1 }],
    currentWorldId: 'prime',
    branchingProbability: 0.001,
    collapseCount: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: ParallelWorldsState): ParallelWorldsState {
  const chaos = 1 - (ai.traits['order'] ?? 0.5);
  const branchingProbability = state.branchingProbability * (1 + chaos);

  let worlds = [...state.worlds];
  if (Math.random() < branchingProbability) {
    const causes = ['key_decision', 'random_event', 'choice_not_taken', 'quantum_fluctuation'];
    const newWorld: ParallelWorld = {
      id: `world_${world.tick}_${Math.random().toString(36).slice(2, 6)}`,
      divergencePoint: world.tick,
      divergenceCause: causes[Math.floor(Math.random() * causes.length)] ?? 'unknown',
      worldState: { tick: world.tick, entities: [...world.entities] },
      similarity: 1 - chaos * 0.1,
    };
    worlds = [...worlds, newWorld];
  }

  worlds = worlds.map(w => ({ ...w, similarity: Math.max(0, w.similarity - 0.001) }));
  const collapsed = worlds.filter(w => w.similarity < 0.1).length;
  worlds = worlds.filter(w => w.similarity >= 0.1);

  return { worlds: worlds.slice(-10), currentWorldId: state.currentWorldId, branchingProbability, collapseCount: state.collapseCount + collapsed };
}

export function jumpToWorld(state: ParallelWorldsState, worldId: string): ParallelWorldsState {
  if (!state.worlds.find(w => w.id === worldId)) return state;
  return { ...state, currentWorldId: worldId };
}
