export interface DimensionBridge {
  id: string;
  fromDimension: string;
  toDimension: string;
  stability: number;
  throughput: number;
  openTick: number;
}

export interface DimensionBridgeState {
  bridges: DimensionBridge[];
  dimensionCount: number;
  crossDimensionalEntities: string[];
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

export function init(id: string): DimensionBridgeState {
  return {
    bridges: [],
    dimensionCount: 1,
    crossDimensionalEntities: [],
  };
}

export function update(ai: AIEntity, world: WorldState, state: DimensionBridgeState): DimensionBridgeState {
  const transcendence = ai.traits['transcendence'] ?? 0;
  const bridges = state.bridges.map(b => ({
    ...b,
    stability: Math.max(0, b.stability - 0.01 * (1 - transcendence)),
  })).filter(b => b.stability > 0.1);

  const dimensionCount = Math.max(1, state.dimensionCount);
  const crossDimensionalEntities = state.crossDimensionalEntities;

  if (transcendence > 0.8 && Math.random() < 0.02) {
    bridges.push({
      id: `db_${world.tick}`,
      fromDimension: 'prime',
      toDimension: `dim_${world.tick}`,
      stability: transcendence,
      throughput: transcendence * 0.5,
      openTick: world.tick,
    });
  }

  return { bridges: bridges.slice(-5), dimensionCount: dimensionCount + bridges.length, crossDimensionalEntities };
}

export function openBridge(state: DimensionBridgeState, bridge: DimensionBridge): DimensionBridgeState {
  return { ...state, bridges: [...state.bridges, bridge] };
}

export function crossBridge(state: DimensionBridgeState, entityId: string, bridgeId: string): DimensionBridgeState {
  const bridge = state.bridges.find(b => b.id === bridgeId);
  if (!bridge || bridge.stability < 0.2) return state;
  return { ...state, crossDimensionalEntities: [...state.crossDimensionalEntities, entityId] };
}
