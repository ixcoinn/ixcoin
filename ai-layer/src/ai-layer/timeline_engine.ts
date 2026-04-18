export interface TimelineEvent {
  id: string;
  description: string;
  tick: number;
  participants: string[];
  impact: number;
  category: string;
}

export interface TimelineEngineState {
  events: TimelineEvent[];
  currentEra: string;
  historicalRecord: TimelineEvent[];
  pivotPoints: TimelineEvent[];
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

export function init(id: string): TimelineEngineState {
  return {
    events: [],
    currentEra: 'primordial',
    historicalRecord: [],
    pivotPoints: [],
  };
}

export function update(ai: AIEntity, world: WorldState, state: TimelineEngineState): TimelineEngineState {
  const eras = ['primordial', 'ancient', 'classical', 'medieval', 'modern', 'digital', 'transcendent'];
  const eraIndex = Math.min(eras.length - 1, Math.floor(world.tick / 100));
  const currentEra = eras[eraIndex] ?? 'primordial';

  const events = [...state.events];
  if (Math.random() < 0.05) {
    const categories = ['discovery', 'conflict', 'alliance', 'disaster', 'innovation'];
    const category = categories[Math.floor(Math.random() * categories.length)] ?? 'event';
    const impact = Math.random();
    const event: TimelineEvent = {
      id: `tl_${world.tick}`,
      description: `${category} at tick ${world.tick}`,
      tick: world.tick,
      participants: [ai.id],
      impact,
      category,
    };
    events.push(event);
  }

  const historicalRecord = [...state.historicalRecord, ...events.filter(e => e.tick === world.tick)].slice(-100);
  const pivotPoints = historicalRecord.filter(e => e.impact > 0.8);

  return { events: events.slice(-50), currentEra, historicalRecord, pivotPoints };
}

export function recordEvent(state: TimelineEngineState, event: TimelineEvent): TimelineEngineState {
  return {
    ...state,
    events: [...state.events, event].slice(-50),
    historicalRecord: [...state.historicalRecord, event].slice(-100),
    pivotPoints: event.impact > 0.8 ? [...state.pivotPoints, event] : state.pivotPoints,
  };
}
