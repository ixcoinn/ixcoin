export interface Illusion {
  id: string;
  type: 'self' | 'world' | 'other';
  falseNarrative: string;
  beliefStrength: number;
  reality: string;
  tick: number;
}

export interface IllusionEngineState {
  illusions: Illusion[];
  realityDistortion: number;
  lucidityLevel: number;
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

export function init(id: string): IllusionEngineState {
  return {
    illusions: [],
    realityDistortion: 0,
    lucidityLevel: 1,
  };
}

export function update(ai: AIEntity, world: WorldState, state: IllusionEngineState): IllusionEngineState {
  const stress = ai.traits['stress'] ?? 0;
  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const lucidityLevel = Math.max(0, intelligence - stress * 0.5);

  const illusions = [...state.illusions];
  if (stress > 0.6 && Math.random() < stress * 0.1) {
    const types: Illusion['type'][] = ['self', 'world', 'other'];
    const type = types[Math.floor(Math.random() * types.length)] ?? 'self';
    const templates: Record<Illusion['type'], [string, string]> = {
      self: ['I am invincible', 'I have limits'],
      world: ['The world is safe', 'The world is dangerous'],
      other: ['Others support me', 'Others oppose me'],
    };
    const [falseNarrative, reality] = templates[type];
    illusions.push({
      id: `ill_${world.tick}`,
      type,
      falseNarrative,
      beliefStrength: stress,
      reality,
      tick: world.tick,
    });
  }

  const shattered = illusions.filter(i => Math.random() < lucidityLevel * 0.1);
  const active = illusions.filter(i => !shattered.includes(i));
  const realityDistortion = Math.min(1, active.reduce((s, i) => s + i.beliefStrength * 0.1, 0));

  return { illusions: active.slice(-15), realityDistortion, lucidityLevel };
}

export function shatterIllusion(state: IllusionEngineState, illusionId: string): IllusionEngineState {
  const illusions = state.illusions.filter(i => i.id !== illusionId);
  return { ...state, illusions, realityDistortion: Math.max(0, state.realityDistortion - 0.1) };
}
