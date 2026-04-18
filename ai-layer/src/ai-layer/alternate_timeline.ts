export interface TimelineBranch {
  id: string;
  parentId: string | null;
  branchTick: number;
  divergenceEvent: string;
  probability: number;
  collapsed: boolean;
}

export interface AlternateTimelineState {
  branches: TimelineBranch[];
  activeBranchId: string;
  branchCount: number;
  observerEffect: number;
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

export function init(id: string): AlternateTimelineState {
  return {
    branches: [{ id: 'prime', parentId: null, branchTick: 0, divergenceEvent: 'origin', probability: 1, collapsed: false }],
    activeBranchId: 'prime',
    branchCount: 1,
    observerEffect: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: AlternateTimelineState): AlternateTimelineState {
  const decisiveness = ai.traits['decisiveness'] ?? 0.5;
  const observerEffect = Math.min(1, state.observerEffect + (1 - decisiveness) * 0.005);

  const branches = state.branches.map(b => {
    if (b.collapsed) return b;
    const collapseChance = (1 - b.probability) * 0.01;
    return { ...b, collapsed: Math.random() < collapseChance };
  });

  const activeBranches = branches.filter(b => !b.collapsed);

  if (Math.random() < (1 - decisiveness) * 0.05) {
    const events = ['choice_made', 'accident', 'discovery', 'death', 'birth'];
    const parent = activeBranches.find(b => b.id === state.activeBranchId);
    const newBranch: TimelineBranch = {
      id: `branch_${world.tick}`,
      parentId: parent?.id ?? null,
      branchTick: world.tick,
      divergenceEvent: events[Math.floor(Math.random() * events.length)] ?? 'unknown',
      probability: Math.random() * 0.5,
      collapsed: false,
    };
    branches.push(newBranch);
  }

  return { branches: branches.slice(-20), activeBranchId: state.activeBranchId, branchCount: branches.filter(b => !b.collapsed).length, observerEffect };
}

export function selectBranch(state: AlternateTimelineState, branchId: string): AlternateTimelineState {
  if (!state.branches.find(b => b.id === branchId && !b.collapsed)) return state;
  return { ...state, activeBranchId: branchId };
}
