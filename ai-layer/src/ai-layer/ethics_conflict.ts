export interface EthicsConflict {
  id: string;
  principle1: string;
  principle2: string;
  resolvedBy: string | null;
  resolution: string | null;
  tick: number;
}

export interface EthicsConflictState {
  conflicts: EthicsConflict[];
  moralDissonance: number;
  resolutionStyle: 'compromise' | 'rigid' | 'contextual';
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

export function init(id: string): EthicsConflictState {
  return {
    conflicts: [],
    moralDissonance: 0,
    resolutionStyle: 'contextual',
  };
}

export function update(ai: AIEntity, world: WorldState, state: EthicsConflictState): EthicsConflictState {
  const empathy = ai.traits['empathy'] ?? 0.5;
  const rigidity = ai.traits['rigidity'] ?? 0.3;
  const intelligence = ai.traits['intelligence'] ?? 0.5;

  const styles: EthicsConflictState['resolutionStyle'][] = ['compromise', 'rigid', 'contextual'];
  const styleIndex = Math.floor(rigidity * 2);
  const resolutionStyle = styles[styleIndex] ?? 'contextual';

  const conflictPairs = [
    ['do_no_harm', 'self_preservation'],
    ['honesty', 'kindness'],
    ['loyalty', 'justice'],
    ['individual_freedom', 'collective_good'],
  ];

  const conflicts = [...state.conflicts];
  if (Math.random() < 0.05) {
    const pair = conflictPairs[Math.floor(Math.random() * conflictPairs.length)] ?? ['unknown1', 'unknown2'];
    const conflict: EthicsConflict = {
      id: `ec_${world.tick}`,
      principle1: pair[0] ?? 'unknown',
      principle2: pair[1] ?? 'unknown',
      resolvedBy: null,
      resolution: null,
      tick: world.tick,
    };
    conflicts.push(conflict);
  }

  const unresolvedCount = conflicts.filter(c => !c.resolvedBy).length;
  const moralDissonance = Math.min(1, unresolvedCount * 0.1 + (1 - empathy) * 0.2);

  const resolved = conflicts.map(c => {
    if (c.resolvedBy) return c;
    if (intelligence > 0.6 && Math.random() < intelligence * 0.3) {
      return {
        ...c,
        resolvedBy: ai.id,
        resolution: resolutionStyle === 'rigid' ? c.principle1 : 'balanced',
      };
    }
    return c;
  });

  return { conflicts: resolved.slice(-20), moralDissonance, resolutionStyle };
}

export function resolveConflict(state: EthicsConflictState, conflictId: string, resolution: string): EthicsConflictState {
  const conflicts = state.conflicts.map(c =>
    c.id === conflictId ? { ...c, resolution, resolvedBy: 'system' } : c
  );
  return { ...state, conflicts, moralDissonance: Math.max(0, state.moralDissonance - 0.1) };
}
