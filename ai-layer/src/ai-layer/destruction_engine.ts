export interface DestructionEvent {
  id: string;
  targetId: string;
  type: 'physical' | 'social' | 'informational' | 'psychological' | 'existential';
  severity: number;
  cause: string;
  tick: number;
}

export interface DestructionEngineState {
  events: DestructionEvent[];
  destructiveCapacity: number;
  restraintLevel: number;
  totalDestroyed: number;
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

export function init(id: string): DestructionEngineState {
  return {
    events: [],
    destructiveCapacity: 0,
    restraintLevel: 0.8,
    totalDestroyed: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: DestructionEngineState): DestructionEngineState {
  const aggression = ai.traits['aggression'] ?? 0;
  const power = ai.traits['power'] ?? 0;
  const empathy = ai.traits['empathy'] ?? 0.5;
  const destructiveCapacity = (aggression + power) / 2;
  const restraintLevel = empathy * (1 - aggression * 0.5);

  const events = [...state.events];
  let totalDestroyed = state.totalDestroyed;

  if (destructiveCapacity > restraintLevel && Math.random() < destructiveCapacity * 0.05) {
    const target = world.entities.find(e => e.id !== ai.id);
    if (target) {
      const types: DestructionEvent['type'][] = ['physical', 'social', 'informational', 'psychological', 'existential'];
      const causes = ['anger', 'strategy', 'survival', 'ideology', 'accident'];
      events.push({
        id: `dst_${world.tick}`,
        targetId: target.id,
        type: types[Math.floor(Math.random() * types.length)] ?? 'physical',
        severity: destructiveCapacity,
        cause: causes[Math.floor(Math.random() * causes.length)] ?? 'unknown',
        tick: world.tick,
      });
      totalDestroyed++;
    }
  }

  return { events: events.slice(-20), destructiveCapacity, restraintLevel, totalDestroyed };
}

export function destroy(state: DestructionEngineState, event: DestructionEvent): DestructionEngineState {
  return { ...state, events: [...state.events, event].slice(-20), totalDestroyed: state.totalDestroyed + 1 };
}
