export interface Group {
  id: string;
  name: string;
  members: string[];
  cohesion: number;
  purpose: string;
  leaderIds: string[];
}

export interface GroupDynamicsState {
  groups: Group[];
  interGroupTension: Record<string, number>;
  dominantGroupId: string | null;
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

export function init(id: string): GroupDynamicsState {
  return {
    groups: [],
    interGroupTension: {},
    dominantGroupId: null,
  };
}

export function update(ai: AIEntity, world: WorldState, state: GroupDynamicsState): GroupDynamicsState {
  const groups = state.groups.map(group => {
    const memberEntities = world.entities.filter(e => group.members.includes(e.id));
    const avgCohesion = memberEntities.reduce((s, e) => s + (e.traits['loyalty'] ?? 0.5), 0) / Math.max(1, memberEntities.length);
    return { ...group, cohesion: avgCohesion };
  });

  const interGroupTension = { ...state.interGroupTension };
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const g1 = groups[i]!;
      const g2 = groups[j]!;
      const key = `${g1.id}_${g2.id}`;
      const existingTension = interGroupTension[key] ?? 0;
      const resourceConflict = Math.random() * 0.05;
      interGroupTension[key] = Math.min(1, existingTension + resourceConflict - 0.01);
    }
  }

  const dominantGroup = groups.sort((a, b) => b.members.length * b.cohesion - a.members.length * a.cohesion)[0];
  return { groups, interGroupTension, dominantGroupId: dominantGroup?.id ?? null };
}

export function formGroup(state: GroupDynamicsState, group: Group): GroupDynamicsState {
  return { ...state, groups: [...state.groups, group] };
}

export function joinGroup(state: GroupDynamicsState, groupId: string, entityId: string): GroupDynamicsState {
  const groups = state.groups.map(g => g.id === groupId
    ? { ...g, members: [...g.members, entityId] }
    : g);
  return { ...state, groups };
}
