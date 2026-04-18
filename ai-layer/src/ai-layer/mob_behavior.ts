export interface MobEvent {
  id: string;
  trigger: string;
  participants: string[];
  intensity: number;
  outcome: 'dispersed' | 'violent' | 'productive' | 'ongoing';
  tick: number;
}

export interface MobBehaviorState {
  events: MobEvent[];
  mobMentality: number;
  currentThreat: number;
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

export function init(id: string): MobBehaviorState {
  return {
    events: [],
    mobMentality: 0,
    currentThreat: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: MobBehaviorState): MobBehaviorState {
  const anger = ai.traits['anger'] ?? 0;
  const fear = ai.traits['fear'] ?? 0;
  const conformity = ai.traits['conformity'] ?? 0.5;

  const populationAnger = world.entities.reduce((s, e) => s + (e.traits['anger'] ?? 0), 0) / Math.max(1, world.entities.length);
  const mobMentality = Math.min(1, populationAnger * conformity * 1.5);
  const currentThreat = (anger + fear) * mobMentality;

  let events = [...state.events];
  if (currentThreat > 0.7 && world.entities.length > 2) {
    const participants = world.entities
      .filter(e => (e.traits['anger'] ?? 0) > 0.5)
      .map(e => e.id);

    if (participants.length >= 2) {
      const intensity = currentThreat;
      const outcomes: MobEvent['outcome'][] = ['dispersed', 'violent', 'productive', 'ongoing'];
      const event: MobEvent = {
        id: `mob_${world.tick}`,
        trigger: 'collective_anger',
        participants,
        intensity,
        outcome: outcomes[Math.floor(Math.random() * outcomes.length)] ?? 'ongoing',
        tick: world.tick,
      };
      events = [...events.slice(-9), event];
    }
  }

  return { events, mobMentality, currentThreat };
}

export function disperseMob(state: MobBehaviorState): MobBehaviorState {
  const events = state.events.map(e =>
    e.outcome === 'ongoing' ? { ...e, outcome: 'dispersed' as MobEvent['outcome'] } : e
  );
  return { ...state, events, mobMentality: state.mobMentality * 0.5 };
}
