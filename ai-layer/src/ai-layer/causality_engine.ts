export interface CausalLink {
  id: string;
  cause: string;
  effect: string;
  strength: number;
  delay: number;
  tick: number;
}

export interface CausalityEngineState {
  links: CausalLink[];
  causalChains: string[][];
  determinismLevel: number;
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

export function init(id: string): CausalityEngineState {
  return {
    links: [],
    causalChains: [],
    determinismLevel: 0.7,
  };
}

export function update(ai: AIEntity, world: WorldState, state: CausalityEngineState): CausalityEngineState {
  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const determinismLevel = intelligence * 0.9;

  const links = [...state.links];
  if (Math.random() < 0.1) {
    const actions = ['action', 'speech', 'trade', 'conflict', 'creation'];
    const effects = ['reaction', 'influence', 'economic_change', 'instability', 'innovation'];
    const actionIdx = Math.floor(Math.random() * actions.length);
    links.push({
      id: `cl_${world.tick}`,
      cause: actions[actionIdx] ?? 'action',
      effect: effects[actionIdx] ?? 'reaction',
      strength: Math.random(),
      delay: Math.floor(Math.random() * 10),
      tick: world.tick,
    });
  }

  const causalChains = buildCausalChains(links.slice(-20));

  return { links: links.slice(-30), causalChains, determinismLevel };
}

function buildCausalChains(links: CausalLink[]): string[][] {
  const chains: string[][] = [];
  for (const link of links) {
    const existingChain = chains.find(c => c.at(-1) === link.cause);
    if (existingChain) {
      existingChain.push(link.effect);
    } else {
      chains.push([link.cause, link.effect]);
    }
  }
  return chains.slice(-10);
}

export function addCausalLink(state: CausalityEngineState, link: CausalLink): CausalityEngineState {
  return { ...state, links: [...state.links, link].slice(-30) };
}
