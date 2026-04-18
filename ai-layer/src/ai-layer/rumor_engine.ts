export interface Rumor {
  id: string;
  content: string;
  origin: string;
  truthLevel: number;
  spread: number;
  carriers: string[];
  tick: number;
}

export interface RumorEngineState {
  rumors: Rumor[];
  spreadRate: number;
  distortionRate: number;
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

export function init(id: string): RumorEngineState {
  return {
    rumors: [],
    spreadRate: 0.3,
    distortionRate: 0.1,
  };
}

export function update(ai: AIEntity, world: WorldState, state: RumorEngineState): RumorEngineState {
  const sociability = ai.traits['sociability'] ?? 0.5;
  const honesty = ai.traits['honesty'] ?? 0.7;

  const rumors = state.rumors.map(rumor => {
    if (!rumor.carriers.includes(ai.id) && Math.random() < state.spreadRate * sociability) {
      const distorted = { ...rumor };
      if (Math.random() < state.distortionRate * (1 - honesty)) {
        distorted.truthLevel = Math.max(0, rumor.truthLevel - 0.1);
        distorted.content = rumor.content + ' [distorted]';
      }
      return { ...distorted, carriers: [...rumor.carriers, ai.id], spread: rumor.spread + 1 };
    }
    return rumor;
  });

  if (Math.random() < 0.05 * sociability && world.entities.length > 1) {
    const newRumor: Rumor = {
      id: `rmr_${world.tick}`,
      content: `Entity ${world.entities[Math.floor(Math.random() * world.entities.length)]?.id ?? 'unknown'} did something notable`,
      origin: ai.id,
      truthLevel: honesty,
      spread: 1,
      carriers: [ai.id],
      tick: world.tick,
    };
    rumors.push(newRumor);
  }

  return { ...state, rumors: rumors.slice(-30) };
}

export function spreadRumor(state: RumorEngineState, rumorId: string, carrier: string): RumorEngineState {
  const rumors = state.rumors.map(r => r.id === rumorId && !r.carriers.includes(carrier)
    ? { ...r, carriers: [...r.carriers, carrier], spread: r.spread + 1 }
    : r);
  return { ...state, rumors };
}
