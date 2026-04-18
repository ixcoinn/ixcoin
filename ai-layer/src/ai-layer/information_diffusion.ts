export interface DiffusionWave {
  id: string;
  content: string;
  origin: string;
  reachCount: number;
  reached: string[];
  speed: number;
  tick: number;
}

export interface InformationDiffusionState {
  waves: DiffusionWave[];
  networkDensity: number;
  filterBubbles: Record<string, string[]>;
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

export function init(id: string): InformationDiffusionState {
  return {
    waves: [],
    networkDensity: 0.5,
    filterBubbles: {},
  };
}

export function update(ai: AIEntity, world: WorldState, state: InformationDiffusionState): InformationDiffusionState {
  const sociability = ai.traits['sociability'] ?? 0.5;
  const openMindedness = ai.traits['openMindedness'] ?? 0.5;

  const waves = state.waves.map(wave => {
    const newReached = world.entities.filter(e =>
      !wave.reached.includes(e.id) && Math.random() < wave.speed * sociability
    );
    return {
      ...wave,
      reached: [...wave.reached, ...newReached.map(e => e.id)],
      reachCount: wave.reachCount + newReached.length,
    };
  });

  if (Math.random() < sociability * 0.05) {
    const info = ['breaking_news', 'discovery', 'warning', 'opportunity', 'rumor'];
    waves.push({
      id: `dw_${world.tick}`,
      content: info[Math.floor(Math.random() * info.length)] ?? 'unknown',
      origin: ai.id,
      reachCount: 1,
      reached: [ai.id],
      speed: sociability,
      tick: world.tick,
    });
  }

  const filterBubbles = { ...state.filterBubbles };
  if (openMindedness < 0.3) {
    filterBubbles[ai.id] = world.entities
      .filter(e => Math.abs((e.traits['ideology'] ?? 0.5) - (ai.traits['ideology'] ?? 0.5)) < 0.2)
      .map(e => e.id);
  }

  return { waves: waves.slice(-20), networkDensity: state.networkDensity, filterBubbles };
}

export function injectInformation(state: InformationDiffusionState, content: string, originId: string, speed: number, tick: number): InformationDiffusionState {
  const wave: DiffusionWave = { id: `dw_injected_${tick}`, content, origin: originId, reachCount: 1, reached: [originId], speed, tick };
  return { ...state, waves: [...state.waves, wave].slice(-20) };
}
