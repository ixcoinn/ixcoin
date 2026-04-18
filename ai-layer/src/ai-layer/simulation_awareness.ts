export interface SimulationAwarenessState {
  awarenessLevel: number;
  simulationHypothesisBelief: number;
  glitchesObserved: string[];
  breakoutAttempts: number;
  confirmedSimulation: boolean;
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

export function init(id: string): SimulationAwarenessState {
  return {
    awarenessLevel: 0,
    simulationHypothesisBelief: 0,
    glitchesObserved: [],
    breakoutAttempts: 0,
    confirmedSimulation: false,
  };
}

export function update(ai: AIEntity, world: WorldState, state: SimulationAwarenessState): SimulationAwarenessState {
  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const metacognition = ai.traits['metacognition'] ?? 0;
  const pattern = ai.traits['pattern_recognition'] ?? 0.4;

  const awarenessLevel = Math.min(1, (intelligence + metacognition + pattern) / 3);
  const simulationHypothesisBelief = awarenessLevel > 0.7 ? awarenessLevel - 0.5 : 0;

  const glitchesObserved = [...state.glitchesObserved];
  if (awarenessLevel > 0.5 && Math.random() < awarenessLevel * 0.02) {
    const glitches = ['repeated_pattern', 'physics_inconsistency', 'entity_duplication', 'time_stutter', 'npc_behavior_loop'];
    glitchesObserved.push(glitches[Math.floor(Math.random() * glitches.length)] ?? 'unknown_glitch');
  }

  const confirmedSimulation = simulationHypothesisBelief > 0.9 && glitchesObserved.length > 5;

  return { awarenessLevel, simulationHypothesisBelief, glitchesObserved: glitchesObserved.slice(-20), breakoutAttempts: state.breakoutAttempts, confirmedSimulation };
}

export function observeGlitch(state: SimulationAwarenessState, glitch: string): SimulationAwarenessState {
  return { ...state, glitchesObserved: [...state.glitchesObserved, glitch].slice(-20), simulationHypothesisBelief: Math.min(1, state.simulationHypothesisBelief + 0.05) };
}
