export interface Era {
  id: string;
  name: string;
  startTick: number;
  endTick: number | null;
  dominantTechnology: string;
  dominantIdeology: string;
  populationMultiplier: number;
  characteristics: string[];
}

export interface EraSystemState {
  eras: Era[];
  currentEraId: string | null;
  transitionProgress: number;
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

const DEFAULT_ERAS: Era[] = [
  { id: 'e1', name: 'Stone Age', startTick: 0, endTick: 100, dominantTechnology: 'stone_tools', dominantIdeology: 'animism', populationMultiplier: 1, characteristics: ['tribal', 'hunter_gatherer'] },
  { id: 'e2', name: 'Bronze Age', startTick: 100, endTick: 300, dominantTechnology: 'metallurgy', dominantIdeology: 'polytheism', populationMultiplier: 3, characteristics: ['agrarian', 'city_states'] },
  { id: 'e3', name: 'Iron Age', startTick: 300, endTick: 600, dominantTechnology: 'iron_smelting', dominantIdeology: 'monotheism', populationMultiplier: 5, characteristics: ['empire', 'philosophy'] },
  { id: 'e4', name: 'Industrial', startTick: 600, endTick: 900, dominantTechnology: 'steam_engine', dominantIdeology: 'nationalism', populationMultiplier: 10, characteristics: ['urbanization', 'mass_production'] },
  { id: 'e5', name: 'Digital', startTick: 900, endTick: null, dominantTechnology: 'computing', dominantIdeology: 'technohumanism', populationMultiplier: 20, characteristics: ['globalization', 'ai'] },
];

export function init(id: string): EraSystemState {
  return {
    eras: DEFAULT_ERAS,
    currentEraId: 'e1',
    transitionProgress: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: EraSystemState): EraSystemState {
  const currentEra = state.eras.find(e => e.id === state.currentEraId);
  if (!currentEra) return state;

  if (currentEra.endTick !== null && world.tick >= currentEra.endTick) {
    const currentIndex = state.eras.findIndex(e => e.id === state.currentEraId);
    const nextEra = state.eras[currentIndex + 1];
    if (nextEra) {
      return { ...state, currentEraId: nextEra.id, transitionProgress: 0 };
    }
  }

  const progress = currentEra.endTick
    ? (world.tick - currentEra.startTick) / (currentEra.endTick - currentEra.startTick)
    : 1;

  return { ...state, transitionProgress: Math.min(1, progress) };
}

export function getCurrentEra(state: EraSystemState): Era | null {
  return state.eras.find(e => e.id === state.currentEraId) ?? null;
}
