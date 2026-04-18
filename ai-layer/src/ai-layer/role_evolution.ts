export interface Role {
  id: string;
  name: string;
  responsibilities: string[];
  privileges: string[];
  requirements: Record<string, number>;
}

export interface RoleEvolutionState {
  currentRole: Role | null;
  roleHistory: { roleId: string; tick: number }[];
  roleFlexibility: number;
  promotionEligible: boolean;
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

const ROLES: Role[] = [
  { id: 'follower', name: 'Follower', responsibilities: ['obey', 'support'], privileges: ['protection'], requirements: { loyalty: 0.5 } },
  { id: 'worker', name: 'Worker', responsibilities: ['produce', 'contribute'], privileges: ['resources'], requirements: { discipline: 0.4 } },
  { id: 'specialist', name: 'Specialist', responsibilities: ['expertise', 'advise'], privileges: ['respect'], requirements: { intelligence: 0.6 } },
  { id: 'leader', name: 'Leader', responsibilities: ['guide', 'decide', 'protect'], privileges: ['power', 'status'], requirements: { leadership: 0.7, charisma: 0.5 } },
];

export function init(id: string): RoleEvolutionState {
  return {
    currentRole: ROLES[0] ?? null,
    roleHistory: [],
    roleFlexibility: 0.5,
    promotionEligible: false,
  };
}

export function update(ai: AIEntity, world: WorldState, state: RoleEvolutionState): RoleEvolutionState {
  const adaptability = ai.traits['adaptability'] ?? 0.5;
  const roleFlexibility = Math.min(1, adaptability);

  let promotionEligible = false;
  let currentRole = state.currentRole;

  for (let i = ROLES.length - 1; i >= 0; i--) {
    const role = ROLES[i];
    if (!role) continue;
    const meetsRequirements = Object.entries(role.requirements).every(([trait, required]) =>
      (ai.traits[trait] ?? 0) >= required
    );
    if (meetsRequirements) {
      if (currentRole?.id !== role.id) {
        currentRole = role;
        promotionEligible = true;
      }
      break;
    }
  }

  const roleHistory = promotionEligible && currentRole
    ? [...state.roleHistory.slice(-9), { roleId: currentRole.id, tick: world.tick }]
    : state.roleHistory;

  return { currentRole, roleHistory, roleFlexibility, promotionEligible };
}

export function assignRole(state: RoleEvolutionState, role: Role, tick: number): RoleEvolutionState {
  return {
    ...state,
    currentRole: role,
    roleHistory: [...state.roleHistory, { roleId: role.id, tick }],
  };
}
