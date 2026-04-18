export interface LoyaltyBond {
  entityId: string;
  targetId: string;
  loyaltyScore: number;
  history: { tick: number; event: string; delta: number }[];
}

export interface LoyaltyEngineState {
  bonds: LoyaltyBond[];
  averageLoyalty: number;
  defectionRisk: number;
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

export function init(id: string): LoyaltyEngineState {
  return {
    bonds: [],
    averageLoyalty: 0.5,
    defectionRisk: 0.1,
  };
}

export function update(ai: AIEntity, world: WorldState, state: LoyaltyEngineState): LoyaltyEngineState {
  const baselyalty = ai.traits['loyalty'] ?? 0.5;
  const stress = ai.traits['stress'] ?? 0;

  const bonds = state.bonds.map(bond => {
    const target = world.entities.find(e => e.id === bond.targetId);
    if (!target) return bond;

    const influence = target.traits['influence'] ?? 0.3;
    const delta = (influence - stress) * 0.02;
    const newScore = Math.max(0, Math.min(1, bond.loyaltyScore + delta));
    const history = [...bond.history.slice(-9), { tick: world.tick, event: 'update', delta }];

    return { ...bond, loyaltyScore: newScore, history };
  });

  const averageLoyalty = bonds.length > 0
    ? bonds.reduce((s, b) => s + b.loyaltyScore, 0) / bonds.length
    : baselyalty;

  const defectionRisk = Math.max(0, (stress - averageLoyalty) * 0.5);

  return { bonds, averageLoyalty, defectionRisk };
}

export function addLoyaltyBond(state: LoyaltyEngineState, entityId: string, targetId: string, initial: number): LoyaltyEngineState {
  const bond: LoyaltyBond = { entityId, targetId, loyaltyScore: initial, history: [] };
  return { ...state, bonds: [...state.bonds, bond] };
}

export function betrayLoyalty(state: LoyaltyEngineState, targetId: string): LoyaltyEngineState {
  const bonds = state.bonds.map(b =>
    b.targetId === targetId ? { ...b, loyaltyScore: Math.max(0, b.loyaltyScore - 0.5) } : b
  );
  return { ...state, bonds, defectionRisk: Math.min(1, state.defectionRisk + 0.3) };
}
