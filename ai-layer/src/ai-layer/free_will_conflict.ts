export interface FreeWillConflict {
  id: string;
  determinedOutcome: string;
  chosenOutcome: string;
  conflictSeverity: number;
  resolved: boolean;
  tick: number;
}

export interface FreeWillConflictState {
  conflicts: FreeWillConflict[];
  freeWillIndex: number;
  determinismScore: number;
  agencyLevel: number;
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

export function init(id: string): FreeWillConflictState {
  return {
    conflicts: [],
    freeWillIndex: 0.5,
    determinismScore: 0.5,
    agencyLevel: 0.7,
  };
}

export function update(ai: AIEntity, world: WorldState, state: FreeWillConflictState): FreeWillConflictState {
  const willpower = ai.traits['willpower'] ?? 0.5;
  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const fatalism = ai.traits['fatalism'] ?? 0.3;

  const freeWillIndex = Math.min(1, willpower * (1 - fatalism));
  const determinismScore = 1 - freeWillIndex;
  const agencyLevel = (freeWillIndex + intelligence) / 2;

  const conflicts = [...state.conflicts];
  if (Math.random() < 0.05) {
    const determined = fatalism > 0.5 ? 'follow_destiny' : 'follow_instinct';
    const chosen = agencyLevel > 0.5 ? 'exercise_choice' : determined;
    const conflict: FreeWillConflict = {
      id: `fwc_${world.tick}`,
      determinedOutcome: determined,
      chosenOutcome: chosen,
      conflictSeverity: Math.abs(freeWillIndex - determinismScore),
      resolved: chosen === determined,
      tick: world.tick,
    };
    conflicts.push(conflict);
  }

  return { conflicts: conflicts.slice(-15), freeWillIndex, determinismScore, agencyLevel };
}

export function exerciseWill(state: FreeWillConflictState, conflictId: string, decision: string): FreeWillConflictState {
  const conflicts = state.conflicts.map(c =>
    c.id === conflictId ? { ...c, chosenOutcome: decision, resolved: true } : c
  );
  return { ...state, conflicts, freeWillIndex: Math.min(1, state.freeWillIndex + 0.05) };
}
