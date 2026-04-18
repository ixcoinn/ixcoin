export interface FearResponse {
  trigger: string;
  intensity: number;
  response: 'fight' | 'flight' | 'freeze' | 'fawn';
  tick: number;
}

export interface FearEngineState {
  fearLevel: number;
  phobias: string[];
  responses: FearResponse[];
  desensitization: Record<string, number>;
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

export function init(id: string): FearEngineState {
  return {
    fearLevel: 0,
    phobias: [],
    responses: [],
    desensitization: {},
  };
}

export function update(ai: AIEntity, world: WorldState, state: FearEngineState): [AIEntity, FearEngineState] {
  const courage = ai.traits['courage'] ?? 0.5;
  const baseFear = 1 - courage;
  const threats = world.entities.filter(e => (e.traits['aggression'] ?? 0) > 0.6 && e.id !== ai.id).length;
  const fearLevel = Math.min(1, baseFear * (1 + threats * 0.2));

  const responses: FearResponse[] = [...state.responses];
  let newTraits = { ...ai.traits };

  if (fearLevel > 0.5) {
    const responseTypes: FearResponse['response'][] = ['fight', 'flight', 'freeze', 'fawn'];
    const responseType = responseTypes[Math.floor((1 - courage) * responseTypes.length)] ?? 'flight';
    const trigger = threats > 0 ? 'threat_present' : 'anticipation';
    const desensitized = state.desensitization[trigger] ?? 0;
    const intensity = Math.max(0, fearLevel - desensitized);

    responses.push({ trigger, intensity, response: responseType, tick: world.tick });

    if (responseType === 'flight') newTraits['speed'] = Math.min(1, (newTraits['speed'] ?? 0) + 0.1);
    if (responseType === 'fight') newTraits['aggression'] = Math.min(1, (newTraits['aggression'] ?? 0) + 0.1);
  }

  const desensitization = { ...state.desensitization };
  for (const r of responses.slice(-5)) {
    desensitization[r.trigger] = Math.min(0.8, (desensitization[r.trigger] ?? 0) + 0.01);
  }

  return [
    { ...ai, traits: newTraits },
    { fearLevel, phobias: state.phobias, responses: responses.slice(-20), desensitization },
  ];
}

export function addPhobia(state: FearEngineState, phobia: string): FearEngineState {
  return { ...state, phobias: [...state.phobias, phobia] };
}
