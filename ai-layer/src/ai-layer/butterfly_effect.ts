export interface ButterflyEvent {
  id: string;
  initialCause: string;
  chain: string[];
  magnitude: number;
  tick: number;
}

export interface ButterflyEffectState {
  events: ButterflyEvent[];
  sensitivityIndex: number;
  trackedChains: number;
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

export function init(id: string): ButterflyEffectState {
  return {
    events: [],
    sensitivityIndex: 0.3,
    trackedChains: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: ButterflyEffectState): ButterflyEffectState {
  const complexity = world.entities.length * Object.keys(world.rules).length;
  const sensitivityIndex = Math.min(1, complexity * 0.01 + 0.2);

  const events = [...state.events];
  let trackedChains = state.trackedChains;

  if (Math.random() < sensitivityIndex * 0.1) {
    const cause = `entity_${ai.id}_action_at_${world.tick}`;
    const chainLength = Math.floor(sensitivityIndex * 5) + 1;
    const chain: string[] = [];
    for (let i = 0; i < chainLength; i++) {
      chain.push(`effect_${i}_from_${cause}`);
    }
    const magnitude = Math.random() * sensitivityIndex;
    events.push({ id: `bf_${world.tick}`, initialCause: cause, chain, magnitude, tick: world.tick });
    trackedChains++;
  }

  return { events: events.slice(-20), sensitivityIndex, trackedChains };
}

export function traceChain(state: ButterflyEffectState, eventId: string): string[] {
  return state.events.find(e => e.id === eventId)?.chain ?? [];
}
