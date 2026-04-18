export interface Value {
  id: string;
  name: string;
  importance: number;
  category: 'intrinsic' | 'instrumental' | 'terminal';
  conflicts: string[];
}

export interface ValueSystemState {
  values: Value[];
  coreValues: string[];
  valueConflicts: { v1Id: string; v2Id: string; severity: number }[];
  integrity: number;
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

export function init(id: string): ValueSystemState {
  return {
    values: [
      { id: 'survival', name: 'Survival', importance: 1.0, category: 'terminal', conflicts: [] },
      { id: 'freedom', name: 'Freedom', importance: 0.8, category: 'terminal', conflicts: ['security'] },
      { id: 'security', name: 'Security', importance: 0.7, category: 'terminal', conflicts: ['freedom'] },
      { id: 'justice', name: 'Justice', importance: 0.7, category: 'intrinsic', conflicts: ['loyalty'] },
      { id: 'loyalty', name: 'Loyalty', importance: 0.6, category: 'intrinsic', conflicts: ['justice'] },
    ],
    coreValues: ['survival'],
    valueConflicts: [],
    integrity: 0.8,
  };
}

export function update(ai: AIEntity, world: WorldState, state: ValueSystemState): ValueSystemState {
  const empathy = ai.traits['empathy'] ?? 0.5;
  const corruption = ai.traits['corruption'] ?? 0;
  const stress = ai.traits['stress'] ?? 0;

  const values = state.values.map(v => {
    let importance = v.importance;
    if (v.id === 'survival') importance = Math.min(1, importance + stress * 0.05);
    if (v.id === 'justice') importance = Math.min(1, importance * (1 - corruption * 0.1));
    return { ...v, importance };
  });

  values.sort((a, b) => b.importance - a.importance);
  const coreValues = values.filter(v => v.importance > 0.7).map(v => v.id);

  const valueConflicts = [];
  for (const v of values) {
    for (const conflictId of v.conflicts) {
      const other = values.find(w => w.id === conflictId);
      if (other && v.importance > 0.5 && other.importance > 0.5) {
        valueConflicts.push({ v1Id: v.id, v2Id: conflictId, severity: (v.importance + other.importance) / 2 });
      }
    }
  }

  const integrity = Math.max(0, 1 - corruption - valueConflicts.length * 0.05);

  return { values, coreValues, valueConflicts, integrity };
}

export function rankValues(state: ValueSystemState): Value[] {
  return [...state.values].sort((a, b) => b.importance - a.importance);
}
