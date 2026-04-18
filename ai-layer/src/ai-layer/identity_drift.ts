export interface IdentitySnapshot {
  tick: number;
  coreTraits: Record<string, number>;
  driftScore: number;
}

export interface IdentityDriftState {
  originalIdentity: Record<string, number>;
  snapshots: IdentitySnapshot[];
  currentDrift: number;
  identityStability: number;
  anchors: string[];
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

export function init(id: string, initialTraits: Record<string, number> = {}): IdentityDriftState {
  return {
    originalIdentity: { ...initialTraits },
    snapshots: [],
    currentDrift: 0,
    identityStability: 1,
    anchors: Object.keys(initialTraits).slice(0, 3),
  };
}

export function update(ai: AIEntity, world: WorldState, state: IdentityDriftState): IdentityDriftState {
  const original = state.originalIdentity;
  let driftSum = 0;
  let count = 0;

  for (const [trait, origValue] of Object.entries(original)) {
    const currentValue = ai.traits[trait] ?? origValue;
    driftSum += Math.abs(currentValue - origValue);
    count++;
  }

  const currentDrift = count > 0 ? driftSum / count : 0;
  const identityStability = Math.max(0, 1 - currentDrift * 2);

  const snapshot: IdentitySnapshot = {
    tick: world.tick,
    coreTraits: { ...ai.traits },
    driftScore: currentDrift,
  };

  return {
    ...state,
    snapshots: [...state.snapshots.slice(-19), snapshot],
    currentDrift,
    identityStability,
  };
}

export function resetToOriginal(ai: AIEntity, state: IdentityDriftState): AIEntity {
  return { ...ai, traits: { ...ai.traits, ...state.originalIdentity } };
}
