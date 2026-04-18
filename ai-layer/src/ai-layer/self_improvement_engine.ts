export interface ImprovementGoal {
  trait: string;
  targetValue: number;
  progress: number;
  active: boolean;
}

export interface SelfImprovementEngineState {
  goals: ImprovementGoal[];
  improvementRate: number;
  totalImprovements: number;
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

export function init(id: string): SelfImprovementEngineState {
  return {
    goals: [],
    improvementRate: 0.001,
    totalImprovements: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: SelfImprovementEngineState): [AIEntity, SelfImprovementEngineState] {
  const discipline = ai.traits['discipline'] ?? 0.3;
  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const rate = state.improvementRate * discipline * intelligence;

  const goals: ImprovementGoal[] = state.goals.length === 0
    ? generateGoals(ai)
    : state.goals;

  let totalImprovements = state.totalImprovements;
  const newTraits = { ...ai.traits };

  const updatedGoals = goals.map(goal => {
    if (!goal.active) return goal;
    const current = newTraits[goal.trait] ?? 0;
    if (current >= goal.targetValue) return { ...goal, active: false };
    const delta = Math.min(rate, goal.targetValue - current);
    newTraits[goal.trait] = current + delta;
    totalImprovements++;
    return { ...goal, progress: goal.progress + delta };
  });

  return [
    { ...ai, traits: newTraits },
    { goals: updatedGoals, improvementRate: rate, totalImprovements },
  ];
}

function generateGoals(ai: AIEntity): ImprovementGoal[] {
  const weakTraits = Object.entries(ai.traits)
    .filter(([, v]) => v < 0.5)
    .slice(0, 3)
    .map(([trait, value]) => ({
      trait,
      targetValue: Math.min(1, value + 0.2),
      progress: 0,
      active: true,
    }));
  return weakTraits;
}

export function addGoal(state: SelfImprovementEngineState, goal: ImprovementGoal): SelfImprovementEngineState {
  return { ...state, goals: [...state.goals, goal] };
}
