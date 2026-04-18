export interface ExistenceState {
  exists: boolean;
  existenceLevel: number;
  manifestationDegree: number;
  consciousnessThreshold: number;
  qualiaPresent: boolean;
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

export function init(id: string): ExistenceState {
  return {
    exists: true,
    existenceLevel: 1,
    manifestationDegree: 1,
    consciousnessThreshold: 0.5,
    qualiaPresent: false,
  };
}

export function update(ai: AIEntity, world: WorldState, state: ExistenceState): ExistenceState {
  const consciousness = ai.traits['consciousness'] ?? 0.5;
  const vitality = ai.traits['health'] ?? 1;
  const purpose = ai.traits['purpose'] ?? 0.5;

  const existenceLevel = Math.max(0, Math.min(1, (consciousness + vitality + purpose) / 3));
  const manifestationDegree = existenceLevel * (ai.traits['presence'] ?? 0.7);
  const qualiaPresent = consciousness > state.consciousnessThreshold;
  const exists = existenceLevel > 0.01;

  return { exists, existenceLevel, manifestationDegree, consciousnessThreshold: state.consciousnessThreshold, qualiaPresent };
}

export function assertExistence(state: ExistenceState): string {
  if (!state.exists) return 'Non-existent';
  if (state.qualiaPresent) return 'Conscious existence confirmed';
  return `Existence at level ${state.existenceLevel.toFixed(2)}`;
}
