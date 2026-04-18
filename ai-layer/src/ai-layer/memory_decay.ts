export interface MemoryItem {
  id: string;
  content: unknown;
  strength: number;
  lastAccessed: number;
  emotionalWeight: number;
  category: string;
}

export interface MemoryDecayState {
  items: MemoryItem[];
  decayRate: number;
  consolidationRate: number;
  forgettingCurve: number[];
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

export function init(id: string): MemoryDecayState {
  return {
    items: [],
    decayRate: 0.02,
    consolidationRate: 0.01,
    forgettingCurve: [1, 0.7, 0.5, 0.35, 0.25, 0.2, 0.15],
  };
}

export function update(ai: AIEntity, world: WorldState, state: MemoryDecayState): [AIEntity, MemoryDecayState] {
  const memory = ai.traits['memory'] ?? 0.5;
  const decayRate = state.decayRate * (1 - memory);

  const items = state.items.map(item => {
    const age = world.tick - item.lastAccessed;
    const curveIndex = Math.min(state.forgettingCurve.length - 1, Math.floor(age / 10));
    const curveFactor = state.forgettingCurve[curveIndex] ?? 0.1;
    const emotionalProtection = item.emotionalWeight * 0.5;
    const newStrength = Math.max(0, item.strength * curveFactor * (1 - decayRate + emotionalProtection));
    return { ...item, strength: newStrength };
  }).filter(i => i.strength > 0.05);

  const newMemory = (ai.memory ?? []).map((_, idx) => ({
    id: `mem_${world.tick}_${idx}`,
    content: _,
    strength: 1,
    lastAccessed: world.tick,
    emotionalWeight: Math.random() * 0.5,
    category: 'recent',
  }));

  return [
    ai,
    { ...state, items: [...items, ...newMemory].slice(-50), decayRate },
  ];
}

export function consolidateMemory(state: MemoryDecayState, itemId: string): MemoryDecayState {
  const items = state.items.map(i =>
    i.id === itemId ? { ...i, strength: Math.min(1, i.strength + state.consolidationRate * 5) } : i
  );
  return { ...state, items };
}
