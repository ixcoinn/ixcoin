export interface CoordinationPlan {
  id: string;
  participants: string[];
  goal: string;
  assignedRoles: Record<string, string>;
  progress: number;
  completed: boolean;
  tick: number;
}

export interface CoordinationEngineState {
  plans: CoordinationPlan[];
  coordinationEfficiency: number;
  trustMatrix: Record<string, number>;
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

export function init(id: string): CoordinationEngineState {
  return {
    plans: [],
    coordinationEfficiency: 0.5,
    trustMatrix: {},
  };
}

export function update(ai: AIEntity, world: WorldState, state: CoordinationEngineState): CoordinationEngineState {
  const leadership = ai.traits['leadership'] ?? 0;
  const cooperation = ai.traits['cooperation'] ?? 0.5;

  const plans = state.plans.map(plan => {
    if (plan.completed) return plan;
    const participantEntities = world.entities.filter(e => plan.participants.includes(e.id));
    const avgCooperation = participantEntities.reduce((s, e) => s + (e.traits['cooperation'] ?? 0.5), 0) / Math.max(1, participantEntities.length);
    const progress = Math.min(1, plan.progress + avgCooperation * 0.05);
    return { ...plan, progress, completed: progress >= 1 };
  });

  if (leadership > 0.5 && world.entities.length > 1 && plans.filter(p => !p.completed).length === 0) {
    const goals = ['build_shelter', 'gather_resources', 'defend_territory', 'explore', 'establish_trade'];
    const goal = goals[Math.floor(Math.random() * goals.length)] ?? 'cooperate';
    const participants = world.entities.slice(0, Math.min(3, world.entities.length)).map(e => e.id);
    const assignedRoles: Record<string, string> = {};
    participants.forEach((id, idx) => { assignedRoles[id] = ['leader', 'worker', 'scout'][idx] ?? 'worker'; });
    plans.push({ id: `cp_${world.tick}`, participants, goal, assignedRoles, progress: 0, completed: false, tick: world.tick });
  }

  const trustMatrix = { ...state.trustMatrix };
  for (const entity of world.entities) {
    if (entity.id !== ai.id) {
      const key = `${ai.id}->${entity.id}`;
      trustMatrix[key] = Math.min(1, (trustMatrix[key] ?? 0) + cooperation * 0.01);
    }
  }

  const coordinationEfficiency = plans.filter(p => p.completed).length / Math.max(1, plans.length);

  return { plans: plans.slice(-10), coordinationEfficiency, trustMatrix };
}

export function createPlan(state: CoordinationEngineState, plan: CoordinationPlan): CoordinationEngineState {
  return { ...state, plans: [...state.plans, plan] };
}
