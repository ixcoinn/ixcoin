export interface ReactionStep {
  id: string;
  trigger: string;
  output: string;
  magnitude: number;
  amplification: number;
}

export interface ChainReactionState {
  activeChains: ReactionStep[][];
  completedChains: number;
  maxAmplification: number;
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

export function init(id: string): ChainReactionState {
  return {
    activeChains: [],
    completedChains: 0,
    maxAmplification: 1,
  };
}

export function update(ai: AIEntity, world: WorldState, state: ChainReactionState): ChainReactionState {
  const volatility = ai.traits['volatility'] ?? 0.3;
  let completedChains = state.completedChains;

  const activeChains = state.activeChains.map(chain => {
    const lastStep = chain.at(-1);
    if (!lastStep) return chain;
    if (Math.random() < lastStep.amplification * volatility) {
      const nextStep: ReactionStep = {
        id: `rs_${world.tick}_${chain.length}`,
        trigger: lastStep.output,
        output: `cascade_${chain.length}`,
        magnitude: lastStep.magnitude * lastStep.amplification,
        amplification: Math.max(0.1, lastStep.amplification * 0.9),
      };
      return [...chain, nextStep];
    }
    completedChains++;
    return [];
  }).filter(c => c.length > 0);

  if (Math.random() < volatility * 0.1) {
    const initialStep: ReactionStep = {
      id: `rs_init_${world.tick}`,
      trigger: 'external_event',
      output: 'primary_effect',
      magnitude: volatility,
      amplification: 1 + volatility,
    };
    activeChains.push([initialStep]);
  }

  const maxAmplification = activeChains.flat().reduce((max, step) => Math.max(max, step.amplification), 1);

  return { activeChains: activeChains.slice(-5), completedChains, maxAmplification };
}

export function triggerChain(state: ChainReactionState, trigger: string, magnitude: number): ChainReactionState {
  const step: ReactionStep = { id: `rs_t_${Date.now()}`, trigger, output: 'triggered_effect', magnitude, amplification: 1.5 };
  return { ...state, activeChains: [...state.activeChains, [step]] };
}
