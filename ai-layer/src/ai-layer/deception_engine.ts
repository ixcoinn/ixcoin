export interface DeceptionAct {
  id: string;
  target: string;
  type: 'lie' | 'omission' | 'misdirection' | 'manipulation';
  success: boolean;
  tick: number;
}

export interface DeceptionEngineState {
  deceptions: DeceptionAct[];
  trustScore: Record<string, number>;
  reputation: number;
  detectionRisk: number;
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

export function init(id: string): DeceptionEngineState {
  return {
    deceptions: [],
    trustScore: {},
    reputation: 0.7,
    detectionRisk: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: DeceptionEngineState): DeceptionEngineState {
  const cunning = ai.traits['cunning'] ?? 0;
  const morality = ai.traits['morality'] ?? 0.5;
  const willDeceive = cunning > 0.5 && morality < 0.4 && Math.random() < cunning * 0.2;

  let deceptions = [...state.deceptions];
  let detectionRisk = state.detectionRisk;
  let reputation = state.reputation;

  if (willDeceive && world.entities.length > 1) {
    const target = world.entities.find(e => e.id !== ai.id);
    if (target) {
      const types: DeceptionAct['type'][] = ['lie', 'omission', 'misdirection', 'manipulation'];
      const type = types[Math.floor(Math.random() * types.length)] ?? 'lie';
      const success = Math.random() < cunning;
      const act: DeceptionAct = { id: `dec_${world.tick}`, target: target.id, type, success, tick: world.tick };
      deceptions = [...deceptions.slice(-19), act];
      detectionRisk = Math.min(1, detectionRisk + (success ? 0.05 : 0.2));
      if (!success) reputation = Math.max(0, reputation - 0.1);
    }
  }

  detectionRisk = Math.max(0, detectionRisk - 0.01);
  return { ...state, deceptions, detectionRisk, reputation };
}

export function attemptDeception(ai: AIEntity, target: AIEntity, state: DeceptionEngineState): boolean {
  const cunning = ai.traits['cunning'] ?? 0;
  const perception = target.traits['perception'] ?? 0.5;
  return Math.random() < cunning - perception;
}
