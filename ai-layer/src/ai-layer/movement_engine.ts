export interface MovementRecord {
  entityId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  reason: string;
  tick: number;
}

export interface MovementEngineState {
  records: MovementRecord[];
  movementSpeed: number;
  pathCache: Record<string, { x: number; y: number }[]>;
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

export function init(id: string): MovementEngineState {
  return {
    records: [],
    movementSpeed: 1,
    pathCache: {},
  };
}

export function update(ai: AIEntity, world: WorldState, state: MovementEngineState, currentX: number, currentY: number): { x: number; y: number; state: MovementEngineState } {
  const speed = ai.traits['speed'] ?? 0.5;
  const agility = ai.traits['agility'] ?? 0.5;
  const movementSpeed = speed * agility;

  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const [dx, dy] = directions[Math.floor(Math.random() * directions.length)] ?? [0, 0];
  const newX = currentX + Math.round((dx ?? 0) * movementSpeed);
  const newY = currentY + Math.round((dy ?? 0) * movementSpeed);

  const record: MovementRecord = {
    entityId: ai.id,
    fromX: currentX,
    fromY: currentY,
    toX: newX,
    toY: newY,
    reason: 'exploration',
    tick: world.tick,
  };

  return {
    x: newX,
    y: newY,
    state: { ...state, records: [...state.records.slice(-19), record], movementSpeed },
  };
}

export function planPath(state: MovementEngineState, entityId: string, waypoints: { x: number; y: number }[]): MovementEngineState {
  return { ...state, pathCache: { ...state.pathCache, [entityId]: waypoints } };
}
