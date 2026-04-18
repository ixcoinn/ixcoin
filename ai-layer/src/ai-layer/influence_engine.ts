export interface InfluenceVector {
  sourceId: string;
  targetId: string;
  type: 'direct' | 'indirect' | 'cultural' | 'economic' | 'coercive';
  strength: number;
  decay: number;
}

export interface InfluenceEngineState {
  vectors: InfluenceVector[];
  totalInfluenceExerted: number;
  influenceNetwork: Record<string, string[]>;
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

export function init(id: string): InfluenceEngineState {
  return {
    vectors: [],
    totalInfluenceExerted: 0,
    influenceNetwork: {},
  };
}

export function update(ai: AIEntity, world: WorldState, state: InfluenceEngineState): InfluenceEngineState {
  const charisma = ai.traits['charisma'] ?? 0;
  const power = ai.traits['power'] ?? 0;
  const influenceStrength = (charisma + power) / 2;

  const newVectors: InfluenceVector[] = [];
  for (const entity of world.entities) {
    if (entity.id === ai.id) continue;
    const susceptibility = 1 - (entity.traits['willpower'] ?? 0.5);
    const type: InfluenceVector['type'] = power > 0.6 ? 'coercive' : charisma > 0.6 ? 'cultural' : 'direct';
    newVectors.push({
      sourceId: ai.id,
      targetId: entity.id,
      type,
      strength: influenceStrength * susceptibility,
      decay: 0.01,
    });
  }

  const vectors = [...state.vectors.filter(v => v.sourceId !== ai.id), ...newVectors]
    .map(v => ({ ...v, strength: Math.max(0, v.strength - v.decay) }))
    .filter(v => v.strength > 0.01);

  const influenceNetwork: Record<string, string[]> = {};
  for (const v of vectors) {
    if (!influenceNetwork[v.sourceId]) influenceNetwork[v.sourceId] = [];
    influenceNetwork[v.sourceId]!.push(v.targetId);
  }

  const totalInfluenceExerted = vectors.reduce((s, v) => s + v.strength, 0);

  return { vectors: vectors.slice(-50), totalInfluenceExerted, influenceNetwork };
}

export function getInfluencedBy(state: InfluenceEngineState, entityId: string): string[] {
  return state.vectors.filter(v => v.targetId === entityId).map(v => v.sourceId);
}
