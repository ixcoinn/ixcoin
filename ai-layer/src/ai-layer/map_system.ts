export interface MapCell {
  x: number;
  y: number;
  terrain: 'plains' | 'forest' | 'mountain' | 'water' | 'desert' | 'urban';
  elevation: number;
  resources: Record<string, number>;
  occupant: string | null;
}

export interface MapSystemState {
  cells: MapCell[];
  width: number;
  height: number;
  entityPositions: Record<string, { x: number; y: number }>;
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

export function init(width: number, height: number): MapSystemState {
  const terrains: MapCell['terrain'][] = ['plains', 'forest', 'mountain', 'water', 'desert', 'urban'];
  const cells: MapCell[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push({
        x, y,
        terrain: terrains[Math.floor(Math.random() * terrains.length)] ?? 'plains',
        elevation: Math.random(),
        resources: { food: Math.random(), water: Math.random(), minerals: Math.random() },
        occupant: null,
      });
    }
  }
  return { cells, width, height, entityPositions: {} };
}

export function update(ai: AIEntity, world: WorldState, state: MapSystemState): MapSystemState {
  return state;
}

export function getCell(state: MapSystemState, x: number, y: number): MapCell | null {
  return state.cells.find(c => c.x === x && c.y === y) ?? null;
}

export function setEntityPosition(state: MapSystemState, entityId: string, x: number, y: number): MapSystemState {
  const cells = state.cells.map(c => {
    if (c.occupant === entityId) return { ...c, occupant: null };
    if (c.x === x && c.y === y) return { ...c, occupant: entityId };
    return c;
  });
  return { ...state, cells, entityPositions: { ...state.entityPositions, [entityId]: { x, y } } };
}

export function getNeighbors(state: MapSystemState, x: number, y: number): MapCell[] {
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return offsets.map(([dx, dy]) => getCell(state, x + (dx ?? 0), y + (dy ?? 0))).filter((c): c is MapCell => c !== null);
}
