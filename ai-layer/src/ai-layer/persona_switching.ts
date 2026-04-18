export interface Persona {
  id: string;
  name: string;
  traitOverrides: Record<string, number>;
  triggerConditions: string[];
  active: boolean;
}

export interface PersonaSwitchingState {
  personas: Persona[];
  activePersonaId: string | null;
  switchHistory: { tick: number; from: string | null; to: string }[];
  stabilityIndex: number;
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

export function init(id: string): PersonaSwitchingState {
  return {
    personas: [],
    activePersonaId: null,
    switchHistory: [],
    stabilityIndex: 1,
  };
}

export function update(ai: AIEntity, world: WorldState, state: PersonaSwitchingState): [AIEntity, PersonaSwitchingState] {
  if (state.personas.length === 0) return [ai, state];

  const stress = ai.traits['stress'] ?? 0;
  const shouldSwitch = stress > 0.7 || Math.random() < 0.05;

  if (!shouldSwitch) return [ai, state];

  const currentPersona = state.personas.find(p => p.id === state.activePersonaId);
  const candidates = state.personas.filter(p => p.id !== state.activePersonaId);
  if (candidates.length === 0) return [ai, state];

  const nextPersona = candidates[Math.floor(Math.random() * candidates.length)]!;
  const newTraits = { ...ai.traits, ...nextPersona.traitOverrides };
  const switchHistory = [
    ...state.switchHistory.slice(-19),
    { tick: world.tick, from: state.activePersonaId, to: nextPersona.id },
  ];
  const stabilityIndex = Math.max(0, state.stabilityIndex - 0.1);

  return [
    { ...ai, traits: newTraits },
    { ...state, activePersonaId: nextPersona.id, switchHistory, stabilityIndex },
  ];
}

export function addPersona(state: PersonaSwitchingState, persona: Persona): PersonaSwitchingState {
  return { ...state, personas: [...state.personas, persona] };
}
