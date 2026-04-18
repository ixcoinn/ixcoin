export interface PriorityItem {
  id: string;
  label: string;
  score: number;
  category: string;
  deadline: number | null;
}

export interface PrioritySystemState {
  items: PriorityItem[];
  topPriorityId: string | null;
  priorityChanges: { itemId: string; oldScore: number; newScore: number; tick: number }[];
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

export function init(id: string): PrioritySystemState {
  return {
    items: [],
    topPriorityId: null,
    priorityChanges: [],
  };
}

export function update(ai: AIEntity, world: WorldState, state: PrioritySystemState): PrioritySystemState {
  const stress = ai.traits['stress'] ?? 0;
  const items = state.items.map(item => {
    const urgencyBonus = item.deadline !== null ? Math.max(0, 1 - (item.deadline - world.tick) / 100) : 0;
    const newScore = Math.min(1, item.score + urgencyBonus * stress * 0.1);
    return { ...item, score: newScore };
  });

  items.sort((a, b) => b.score - a.score);
  const topPriorityId = items[0]?.id ?? null;

  const priorityChanges = [...state.priorityChanges];
  for (let i = 0; i < Math.min(items.length, state.items.length); i++) {
    const newItem = items[i];
    const oldItem = state.items[i];
    if (newItem && oldItem && newItem.id === oldItem.id && Math.abs(newItem.score - oldItem.score) > 0.05) {
      priorityChanges.push({ itemId: newItem.id, oldScore: oldItem.score, newScore: newItem.score, tick: world.tick });
    }
  }

  return { items, topPriorityId, priorityChanges: priorityChanges.slice(-20) };
}

export function addItem(state: PrioritySystemState, item: PriorityItem): PrioritySystemState {
  return { ...state, items: [...state.items, item].sort((a, b) => b.score - a.score) };
}

export function reprioritize(state: PrioritySystemState, itemId: string, newScore: number, tick: number): PrioritySystemState {
  const items = state.items.map(i => i.id === itemId ? { ...i, score: newScore } : i).sort((a, b) => b.score - a.score);
  const old = state.items.find(i => i.id === itemId);
  const changes = old ? [...state.priorityChanges, { itemId, oldScore: old.score, newScore, tick }] : state.priorityChanges;
  return { ...state, items, topPriorityId: items[0]?.id ?? null, priorityChanges: changes.slice(-20) };
}
