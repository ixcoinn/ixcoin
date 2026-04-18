export interface BetrayalEvent {
  id: string;
  betrayer: string;
  victim: string;
  severity: number;
  reason: string;
  tick: number;
}

export interface BetrayalSystemState {
  betrayals: BetrayalEvent[];
  betrayalThreshold: number;
  trustDamage: Record<string, number>;
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

export function init(id: string): BetrayalSystemState {
  return {
    betrayals: [],
    betrayalThreshold: 0.7,
    trustDamage: {},
  };
}

export function update(ai: AIEntity, world: WorldState, state: BetrayalSystemState): BetrayalSystemState {
  const selfInterest = ai.traits['selfInterest'] ?? 0.3;
  const loyalty = ai.traits['loyalty'] ?? 0.7;
  const pressure = 1 - (ai.traits['stress'] ?? 0);
  const betrayalLikelihood = selfInterest * (1 - loyalty) * pressure;

  let betrayals = [...state.betrayals];
  const trustDamage = { ...state.trustDamage };

  if (betrayalLikelihood > state.betrayalThreshold * Math.random()) {
    const ally = world.entities.find(e => e.id !== ai.id);
    if (ally) {
      const severity = betrayalLikelihood;
      const event: BetrayalEvent = {
        id: `btrl_${world.tick}`,
        betrayer: ai.id,
        victim: ally.id,
        severity,
        reason: selfInterest > 0.7 ? 'greed' : 'survival',
        tick: world.tick,
      };
      betrayals = [...betrayals.slice(-9), event];
      trustDamage[ally.id] = Math.min(1, (trustDamage[ally.id] ?? 0) + severity);
    }
  }

  return { ...state, betrayals, trustDamage };
}

export function calculateRevenge(state: BetrayalSystemState, targetId: string): number {
  const damage = state.trustDamage[targetId] ?? 0;
  return Math.min(1, damage * 1.2);
}
