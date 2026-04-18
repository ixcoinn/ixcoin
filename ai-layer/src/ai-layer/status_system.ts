export interface StatusLevel {
  rank: number;
  title: string;
  minPrestige: number;
  perks: string[];
}

export interface StatusSystemState {
  prestige: number;
  currentStatusId: string;
  statusHistory: { statusId: string; tick: number }[];
  rivalries: string[];
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

const STATUS_LEVELS: StatusLevel[] = [
  { rank: 0, title: 'outcast', minPrestige: 0, perks: [] },
  { rank: 1, title: 'commoner', minPrestige: 0.1, perks: ['basic_rights'] },
  { rank: 2, title: 'skilled', minPrestige: 0.3, perks: ['guild_access', 'fair_trade'] },
  { rank: 3, title: 'notable', minPrestige: 0.5, perks: ['council_seat', 'reputation'] },
  { rank: 4, title: 'elite', minPrestige: 0.7, perks: ['special_privileges', 'influence'] },
  { rank: 5, title: 'legendary', minPrestige: 0.9, perks: ['historical_recognition', 'immortality'] },
];

export function init(id: string): StatusSystemState {
  return {
    prestige: 0.1,
    currentStatusId: 'commoner',
    statusHistory: [],
    rivalries: [],
  };
}

export function update(ai: AIEntity, world: WorldState, state: StatusSystemState): StatusSystemState {
  const achievements = ai.traits['achievements'] ?? 0;
  const influence = ai.traits['influence'] ?? 0;
  const charisma = ai.traits['charisma'] ?? 0;

  const prestige = Math.min(1, (achievements + influence + charisma) / 3 + state.prestige * 0.95);

  const statusLevel = STATUS_LEVELS.filter(s => prestige >= s.minPrestige).at(-1);
  const currentStatusId = statusLevel?.title ?? 'commoner';

  const rivalries = world.entities
    .filter(e => e.id !== ai.id && Math.abs((e.traits['influence'] ?? 0) - influence) < 0.1)
    .map(e => e.id);

  const statusHistory = state.currentStatusId !== currentStatusId
    ? [...state.statusHistory.slice(-9), { statusId: currentStatusId, tick: world.tick }]
    : state.statusHistory;

  return { prestige, currentStatusId, statusHistory, rivalries };
}

export function challengeStatus(state: StatusSystemState, rivalId: string): StatusSystemState {
  return { ...state, rivalries: [...state.rivalries, rivalId] };
}
