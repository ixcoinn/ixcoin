export interface AbsurdEvent {
  id: string;
  description: string;
  logicScore: number;
  meaningfulness: number;
  accepted: boolean;
  tick: number;
}

export interface AbsurdityEngineState {
  events: AbsurdEvent[];
  absurdityIndex: number;
  camus: number;
  revolted: boolean;
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

export function init(id: string): AbsurdityEngineState {
  return {
    events: [],
    absurdityIndex: 0,
    camus: 0.5,
    revolted: false,
  };
}

export function update(ai: AIEntity, world: WorldState, state: AbsurdityEngineState): AbsurdityEngineState {
  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const existentialDread = 1 - (ai.traits['purpose'] ?? 0.5);
  const absurdityIndex = Math.min(1, existentialDread * intelligence);

  const events = [...state.events];
  if (absurdityIndex > 0.3 && Math.random() < absurdityIndex * 0.05) {
    const absurdThings = [
      'Entity spent 100 ticks building something immediately destroyed',
      'Identical choices led to opposite outcomes',
      'The most rational path led to catastrophe',
      'Success felt as empty as failure',
    ];
    events.push({
      id: `abs_${world.tick}`,
      description: absurdThings[Math.floor(Math.random() * absurdThings.length)] ?? 'Absurd occurrence',
      logicScore: 1 - absurdityIndex,
      meaningfulness: Math.random() * 0.3,
      accepted: Math.random() < (ai.traits['acceptance'] ?? 0.5),
      tick: world.tick,
    });
  }

  const camus = Math.min(1, state.camus + absurdityIndex * 0.01);
  const revolted = absurdityIndex > 0.8 && (ai.traits['rebelliousness'] ?? 0) > 0.6;

  return { events: events.slice(-15), absurdityIndex, camus, revolted };
}

export function embrace(state: AbsurdityEngineState): AbsurdityEngineState {
  return { ...state, camus: Math.min(1, state.camus + 0.1), revolted: false };
}
