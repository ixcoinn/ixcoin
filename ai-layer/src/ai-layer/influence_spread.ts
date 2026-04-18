export interface InfluenceNode {
  entityId: string;
  influenceScore: number;
  connections: string[];
  tier: number;
}

export interface InfluenceSpreadState {
  nodes: InfluenceNode[];
  spreadEvents: { from: string; to: string; amount: number; tick: number }[];
  totalSpread: number;
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

export function init(id: string): InfluenceSpreadState {
  return {
    nodes: [],
    spreadEvents: [],
    totalSpread: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: InfluenceSpreadState): InfluenceSpreadState {
  const charisma = ai.traits['charisma'] ?? 0;
  const reach = ai.traits['reach'] ?? 0.3;

  const nodes = state.nodes.map(node => {
    if (node.entityId !== ai.id) return node;
    const connected = world.entities
      .filter(e => e.id !== ai.id && Math.random() < reach)
      .map(e => e.id);
    return { ...node, influenceScore: charisma, connections: connected };
  });

  if (!nodes.find(n => n.entityId === ai.id)) {
    nodes.push({ entityId: ai.id, influenceScore: charisma, connections: [], tier: 1 });
  }

  const spreadEvents = [...state.spreadEvents];
  let totalSpread = state.totalSpread;

  for (const node of nodes) {
    for (const conn of node.connections) {
      if (Math.random() < node.influenceScore * 0.1) {
        spreadEvents.push({ from: node.entityId, to: conn, amount: node.influenceScore * 0.1, tick: world.tick });
        totalSpread++;
      }
    }
  }

  return { nodes: nodes.slice(-30), spreadEvents: spreadEvents.slice(-20), totalSpread };
}

export function measureReach(state: InfluenceSpreadState, entityId: string): number {
  return state.nodes.find(n => n.entityId === entityId)?.connections.length ?? 0;
}
