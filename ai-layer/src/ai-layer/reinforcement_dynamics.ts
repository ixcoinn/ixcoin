export interface RewardSignal {
  action: string;
  reward: number;
  state: string;
  tick: number;
}

export interface ReinforcementDynamicsState {
  qTable: Record<string, Record<string, number>>;
  rewardHistory: RewardSignal[];
  learningRate: number;
  discountFactor: number;
  epsilon: number;
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

export function init(id: string): ReinforcementDynamicsState {
  return {
    qTable: {},
    rewardHistory: [],
    learningRate: 0.1,
    discountFactor: 0.9,
    epsilon: 0.2,
  };
}

export function update(ai: AIEntity, world: WorldState, state: ReinforcementDynamicsState): ReinforcementDynamicsState {
  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const learningRate = state.learningRate * intelligence;

  const stateKey = Object.entries(ai.traits).map(([k, v]) => `${k}:${v.toFixed(1)}`).join('|');
  const actions = ['explore', 'cooperate', 'compete', 'rest', 'create'];
  const action = Math.random() < state.epsilon
    ? (actions[Math.floor(Math.random() * actions.length)] ?? 'rest')
    : getBestAction(state.qTable, stateKey, actions);

  const reward = computeReward(ai, action);

  const qTable = { ...state.qTable };
  if (!qTable[stateKey]) qTable[stateKey] = {};
  const currentQ = qTable[stateKey]![action] ?? 0;
  const maxNextQ = Math.max(...actions.map(a => (qTable[stateKey]?.[a] ?? 0)));
  qTable[stateKey]![action] = currentQ + learningRate * (reward + state.discountFactor * maxNextQ - currentQ);

  const rewardHistory = [...state.rewardHistory.slice(-19), { action, reward, state: stateKey, tick: world.tick }];
  const epsilon = Math.max(0.01, state.epsilon * 0.999);

  return { qTable, rewardHistory, learningRate, discountFactor: state.discountFactor, epsilon };
}

function getBestAction(qTable: Record<string, Record<string, number>>, stateKey: string, actions: string[]): string {
  const stateQ = qTable[stateKey] ?? {};
  return actions.reduce((best, action) => (stateQ[action] ?? 0) > (stateQ[best] ?? 0) ? action : best, actions[0] ?? 'rest');
}

function computeReward(ai: AIEntity, action: string): number {
  if (action === 'cooperate') return (ai.traits['social'] ?? 0.5) * 0.5;
  if (action === 'compete') return (ai.traits['aggression'] ?? 0.3) * 0.3;
  if (action === 'create') return (ai.traits['creativity'] ?? 0.3) * 0.4;
  if (action === 'explore') return (ai.traits['curiosity'] ?? 0.4) * 0.3;
  return 0.1;
}
