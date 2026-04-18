export interface RealityLayer {
  id: string;
  name: string;
  physicsConstants: Record<string, number>;
  perceptionFilter: number;
  consensus: number;
}

export interface RealityEngineState {
  layers: RealityLayer[];
  activeLayerId: string;
  realityCoherence: number;
  perceivedVsActual: number;
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

export function init(id: string): RealityEngineState {
  const baseLayer: RealityLayer = {
    id: 'base',
    name: 'Consensus Reality',
    physicsConstants: { gravity: 9.8, lightSpeed: 299792458, timeRate: 1 },
    perceptionFilter: 1,
    consensus: 1,
  };
  return {
    layers: [baseLayer],
    activeLayerId: 'base',
    realityCoherence: 1,
    perceivedVsActual: 1,
  };
}

export function update(ai: AIEntity, world: WorldState, state: RealityEngineState): RealityEngineState {
  const perception = ai.traits['perception'] ?? 0.8;
  const sanity = ai.traits['sanity'] ?? 1;
  const perceivedVsActual = Math.min(1, perception * sanity);
  const realityCoherence = Math.min(1, state.layers.reduce((s, l) => s + l.consensus, 0) / state.layers.length);
  return { ...state, perceivedVsActual, realityCoherence };
}

export function shiftLayer(state: RealityEngineState, layerId: string): RealityEngineState {
  if (!state.layers.find(l => l.id === layerId)) return state;
  return { ...state, activeLayerId: layerId };
}

export function addLayer(state: RealityEngineState, layer: RealityLayer): RealityEngineState {
  return { ...state, layers: [...state.layers, layer] };
}
