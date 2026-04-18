export interface GeneticMemoryRecord {
  id: string;
  encodedExperience: string;
  survivalValue: number;
  generation: number;
  tick: number;
}

export interface GeneticMemoryState {
  records: GeneticMemoryRecord[];
  inheritanceStrength: number;
  expressedMemories: string[];
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

export function init(id: string): GeneticMemoryState {
  return {
    records: [],
    inheritanceStrength: 0.5,
    expressedMemories: [],
  };
}

export function update(ai: AIEntity, world: WorldState, state: GeneticMemoryState): [AIEntity, GeneticMemoryState] {
  const adaptability = ai.traits['adaptability'] ?? 0.5;
  const newTraits = { ...ai.traits };

  const expressedMemories: string[] = [];
  for (const record of state.records) {
    if (record.survivalValue > 0.6 && Math.random() < state.inheritanceStrength) {
      expressedMemories.push(record.id);
      if (record.encodedExperience.includes('avoid')) {
        newTraits['caution'] = Math.min(1, (newTraits['caution'] ?? 0) + 0.02);
      }
      if (record.encodedExperience.includes('cooperate')) {
        newTraits['cooperation'] = Math.min(1, (newTraits['cooperation'] ?? 0) + 0.02);
      }
    }
  }

  const newRecords = [...state.records];
  if (adaptability > 0.5 && Math.random() < 0.05) {
    newRecords.push({
      id: `gm_${world.tick}`,
      encodedExperience: adaptability > 0.7 ? 'cooperate_for_survival' : 'avoid_danger',
      survivalValue: adaptability,
      generation: 1,
      tick: world.tick,
    });
  }

  return [
    { ...ai, traits: newTraits },
    { records: newRecords.slice(-30), inheritanceStrength: state.inheritanceStrength, expressedMemories },
  ];
}

export function encodeMemory(state: GeneticMemoryState, experience: string, survivalValue: number, generation: number, tick: number): GeneticMemoryState {
  const record: GeneticMemoryRecord = { id: `gm_${tick}`, encodedExperience: experience, survivalValue, generation, tick };
  return { ...state, records: [...state.records, record].slice(-30) };
}
