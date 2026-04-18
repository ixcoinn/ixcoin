export interface CulturalTrait {
  id: string;
  name: string;
  domain: 'art' | 'ritual' | 'language' | 'food' | 'governance' | 'sport';
  prevalence: number;
  originEntityId: string;
}

export interface CultureEngineState {
  traits: CulturalTrait[];
  culturalDiversity: number;
  homogenization: number;
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

export function init(id: string): CultureEngineState {
  return {
    traits: [],
    culturalDiversity: 0.5,
    homogenization: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: CultureEngineState): CultureEngineState {
  const creativity = ai.traits['creativity'] ?? 0.3;
  const sociability = ai.traits['sociability'] ?? 0.5;

  const traits = state.traits.map(t => ({
    ...t,
    prevalence: Math.min(1, t.prevalence + sociability * 0.01 - 0.005),
  })).filter(t => t.prevalence > 0.05);

  if (Math.random() < creativity * 0.05) {
    const domains: CulturalTrait['domain'][] = ['art', 'ritual', 'language', 'food', 'governance', 'sport'];
    const domain = domains[Math.floor(Math.random() * domains.length)] ?? 'art';
    traits.push({
      id: `ct_${world.tick}`,
      name: `culture_${domain}_${world.tick}`,
      domain,
      prevalence: 0.1,
      originEntityId: ai.id,
    });
  }

  const diversityCount = new Set(traits.map(t => t.domain)).size;
  const culturalDiversity = Math.min(1, diversityCount / 6);
  const homogenization = traits.length > 0 ? traits.filter(t => t.prevalence > 0.8).length / traits.length : 0;

  return { traits: traits.slice(-40), culturalDiversity, homogenization };
}

export function adoptTrait(state: CultureEngineState, traitId: string): CultureEngineState {
  const traits = state.traits.map(t => t.id === traitId ? { ...t, prevalence: Math.min(1, t.prevalence + 0.1) } : t);
  return { ...state, traits };
}
