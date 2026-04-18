export interface AmbitionGoal {
  id: string;
  description: string;
  priority: number;
  progress: number;
  completed: boolean;
  deadline: number | null;
}

export interface AmbitionEngineState {
  goals: AmbitionGoal[];
  ambitionLevel: number;
  overreachRisk: number;
  achievementCount: number;
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

export function init(id: string): AmbitionEngineState {
  return {
    goals: [],
    ambitionLevel: 0.5,
    overreachRisk: 0,
    achievementCount: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: AmbitionEngineState): AmbitionEngineState {
  const ambition = ai.traits['ambition'] ?? 0.5;
  const capability = (ai.traits['intelligence'] ?? 0.5) * (ai.traits['discipline'] ?? 0.5);

  const ambitionLevel = Math.min(1, ambition * 1.1);
  const overreachRisk = Math.max(0, ambitionLevel - capability);

  let achievementCount = state.achievementCount;
  const goals = state.goals.map(goal => {
    if (goal.completed) return goal;
    const progressDelta = capability * ambition * 0.05;
    const progress = Math.min(1, goal.progress + progressDelta);
    const completed = progress >= 1;
    if (completed) achievementCount++;
    return { ...goal, progress, completed };
  });

  if (goals.filter(g => !g.completed).length === 0 && ambitionLevel > 0.4) {
    const descriptions = ['accumulate resources', 'gain followers', 'master new skills', 'expand territory', 'achieve recognition'];
    const desc = descriptions[Math.floor(Math.random() * descriptions.length)] ?? 'grow';
    goals.push({
      id: `ag_${world.tick}`,
      description: desc,
      priority: ambitionLevel,
      progress: 0,
      completed: false,
      deadline: world.tick + 100,
    });
  }

  return { goals: goals.slice(-10), ambitionLevel, overreachRisk, achievementCount };
}

export function setGoal(state: AmbitionEngineState, goal: AmbitionGoal): AmbitionEngineState {
  return { ...state, goals: [...state.goals, goal] };
}
