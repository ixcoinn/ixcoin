export interface CollapseEvent {
  id: string;
  type: 'economic' | 'social' | 'political' | 'environmental' | 'civilizational';
  severity: number;
  cause: string;
  affectedEntities: string[];
  tick: number;
}

export interface CollapseEngineState {
  events: CollapseEvent[];
  collapseRisk: number;
  systemIntegrity: number;
  recoveryRate: number;
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

export function init(id: string): CollapseEngineState {
  return {
    events: [],
    collapseRisk: 0.1,
    systemIntegrity: 1.0,
    recoveryRate: 0.01,
  };
}

export function update(ai: AIEntity, world: WorldState, state: CollapseEngineState): CollapseEngineState {
  const populationStress = world.entities.reduce((s, e) => s + (e.traits['stress'] ?? 0), 0) / Math.max(1, world.entities.length);
  const collapseRisk = Math.min(1, populationStress * 0.5 + (1 - state.systemIntegrity) * 0.3);
  const systemIntegrity = Math.max(0, state.systemIntegrity - collapseRisk * 0.01 + state.recoveryRate);

  const events = [...state.events];
  if (collapseRisk > 0.7 && Math.random() < collapseRisk * 0.1) {
    const types: CollapseEvent['type'][] = ['economic', 'social', 'political', 'environmental', 'civilizational'];
    const type = types[Math.floor(collapseRisk * (types.length - 1))] ?? 'social';
    const causes = ['resource_depletion', 'power_vacuum', 'mass_dissatisfaction', 'external_shock'];
    events.push({
      id: `col_${world.tick}`,
      type,
      severity: collapseRisk,
      cause: causes[Math.floor(Math.random() * causes.length)] ?? 'unknown',
      affectedEntities: world.entities.map(e => e.id),
      tick: world.tick,
    });
  }

  return { events: events.slice(-10), collapseRisk, systemIntegrity, recoveryRate: state.recoveryRate };
}

export function triggerCollapse(state: CollapseEngineState, type: CollapseEvent['type'], severity: number, tick: number): CollapseEngineState {
  const event: CollapseEvent = { id: `col_forced_${tick}`, type, severity, cause: 'forced', affectedEntities: [], tick };
  return { ...state, events: [...state.events, event], systemIntegrity: Math.max(0, state.systemIntegrity - severity) };
}
