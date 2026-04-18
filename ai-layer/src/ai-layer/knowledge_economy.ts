export interface KnowledgeAsset {
  id: string;
  topic: string;
  value: number;
  owner: string;
  shared: boolean;
  tick: number;
}

export interface KnowledgeEconomyState {
  assets: KnowledgeAsset[];
  knowledgeBalance: number;
  transactionHistory: { from: string; to: string; assetId: string; tick: number }[];
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

export function init(id: string): KnowledgeEconomyState {
  return {
    assets: [],
    knowledgeBalance: 0,
    transactionHistory: [],
  };
}

export function update(ai: AIEntity, world: WorldState, state: KnowledgeEconomyState): KnowledgeEconomyState {
  const curiosity = ai.traits['curiosity'] ?? 0.4;
  const generosity = ai.traits['generosity'] ?? 0.3;

  const newAssets = [...state.assets];
  let knowledgeBalance = state.knowledgeBalance;

  if (Math.random() < curiosity * 0.2) {
    const topics = ['science', 'history', 'strategy', 'culture', 'technology', 'nature'];
    const topic = topics[Math.floor(Math.random() * topics.length)] ?? 'general';
    const asset: KnowledgeAsset = {
      id: `ka_${world.tick}_${Math.random().toString(36).slice(2, 6)}`,
      topic,
      value: Math.random() * curiosity,
      owner: ai.id,
      shared: false,
      tick: world.tick,
    };
    newAssets.push(asset);
    knowledgeBalance += asset.value;
  }

  const transactions = [...state.transactionHistory];
  if (generosity > 0.5 && newAssets.length > 0) {
    const shareableAssets = newAssets.filter(a => a.owner === ai.id && !a.shared);
    for (const asset of shareableAssets.slice(0, 1)) {
      const target = world.entities.find(e => e.id !== ai.id);
      if (target) {
        asset.shared = true;
        transactions.push({ from: ai.id, to: target.id, assetId: asset.id, tick: world.tick });
      }
    }
  }

  return { assets: newAssets.slice(-50), knowledgeBalance, transactionHistory: transactions.slice(-20) };
}

export function transferKnowledge(state: KnowledgeEconomyState, assetId: string, newOwner: string): KnowledgeEconomyState {
  const assets = state.assets.map(a => a.id === assetId ? { ...a, owner: newOwner } : a);
  return { ...state, assets };
}
