export interface PowerRelation {
  dominantId: string;
  subordinateId: string;
  powerDelta: number;
  relationship: 'authority' | 'coercion' | 'influence' | 'charisma';
}

export interface PowerDynamicsState {
  relations: PowerRelation[];
  powerHierarchy: string[];
  powerConcentration: number;
  resistance: number;
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

export function init(id: string): PowerDynamicsState {
  return {
    relations: [],
    powerHierarchy: [],
    powerConcentration: 0,
    resistance: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: PowerDynamicsState): PowerDynamicsState {
  const power = ai.traits['power'] ?? 0;

  const relations: PowerRelation[] = [];
  for (const entity of world.entities) {
    if (entity.id === ai.id) continue;
    const entityPower = entity.traits['power'] ?? 0;
    if (power > entityPower + 0.1) {
      const types: PowerRelation['relationship'][] = ['authority', 'coercion', 'influence', 'charisma'];
      const type = types[Math.floor((power - entityPower) * types.length)] ?? 'influence';
      relations.push({ dominantId: ai.id, subordinateId: entity.id, powerDelta: power - entityPower, relationship: type });
    }
  }

  const powerScores = world.entities.map(e => ({ id: e.id, power: e.traits['power'] ?? 0 }));
  powerScores.sort((a, b) => b.power - a.power);
  const powerHierarchy = powerScores.map(p => p.id);

  const totalPower = powerScores.reduce((s, p) => s + p.power, 0);
  const topPower = powerScores[0]?.power ?? 0;
  const powerConcentration = totalPower > 0 ? topPower / totalPower : 0;

  const resistance = Math.min(1, powerConcentration * (1 - (ai.traits['compliance'] ?? 0.5)));

  return { relations, powerHierarchy, powerConcentration, resistance };
}

export function challengePower(state: PowerDynamicsState, challengerId: string, incumbentId: string): boolean {
  const challengerRank = state.powerHierarchy.indexOf(challengerId);
  const incumbentRank = state.powerHierarchy.indexOf(incumbentId);
  return challengerRank < incumbentRank;
}
