export interface Constraint {
  id: string;
  name: string;
  type: 'hard' | 'soft';
  condition: string;
  penalty: number;
  active: boolean;
}

export interface ConstraintSystemState {
  constraints: Constraint[];
  violationCount: number;
  constraintScore: number;
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

export function init(id: string): ConstraintSystemState {
  return {
    constraints: [],
    violationCount: 0,
    constraintScore: 1,
  };
}

export function update(ai: AIEntity, world: WorldState, state: ConstraintSystemState): ConstraintSystemState {
  let violationCount = 0;
  let totalPenalty = 0;

  const constraints = state.constraints.map(constraint => {
    if (!constraint.active) return constraint;
    const traitValue = ai.traits[constraint.condition] ?? 1;
    const violated = traitValue < 0.2 && constraint.type === 'hard';
    if (violated) {
      violationCount++;
      totalPenalty += constraint.penalty;
    }
    return constraint;
  });

  const constraintScore = Math.max(0, 1 - totalPenalty);

  return { constraints, violationCount, constraintScore };
}

export function addConstraint(state: ConstraintSystemState, constraint: Constraint): ConstraintSystemState {
  return { ...state, constraints: [...state.constraints, constraint] };
}

export function removeConstraint(state: ConstraintSystemState, constraintId: string): ConstraintSystemState {
  return { ...state, constraints: state.constraints.filter(c => c.id !== constraintId) };
}

export function enforceConstraint(state: ConstraintSystemState, constraintId: string, ai: AIEntity): boolean {
  const c = state.constraints.find(c => c.id === constraintId);
  if (!c || !c.active) return true;
  const value = ai.traits[c.condition] ?? 1;
  return value >= 0.2;
}
