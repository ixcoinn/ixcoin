export interface CollectiveInsight {
  id: string;
  contributors: string[];
  insight: string;
  combinedIntelligence: number;
  emergenceScore: number;
  tick: number;
}

export interface CollectiveIntelligenceState {
  insights: CollectiveInsight[];
  swarmIQ: number;
  consensusReached: boolean;
  diversity: number;
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

export function init(id: string): CollectiveIntelligenceState {
  return {
    insights: [],
    swarmIQ: 0.5,
    consensusReached: false,
    diversity: 0.5,
  };
}

export function update(ai: AIEntity, world: WorldState, state: CollectiveIntelligenceState): CollectiveIntelligenceState {
  const entities = world.entities;
  if (entities.length === 0) return state;

  const avgIntelligence = entities.reduce((s, e) => s + (e.traits['intelligence'] ?? 0.5), 0) / entities.length;
  const intelligenceVariance = entities.reduce((s, e) => s + Math.pow((e.traits['intelligence'] ?? 0.5) - avgIntelligence, 2), 0) / entities.length;
  const diversity = Math.min(1, Math.sqrt(intelligenceVariance) * 2);

  const emergenceBonus = diversity * 0.2;
  const swarmIQ = Math.min(1.5, avgIntelligence + emergenceBonus);

  const insights = [...state.insights];
  if (Math.random() < swarmIQ * 0.05 && entities.length > 1) {
    const contributors = entities.slice(0, Math.min(3, entities.length)).map(e => e.id);
    const insightTypes = ['pattern_recognition', 'solution_synthesis', 'prediction', 'risk_assessment'];
    insights.push({
      id: `ci_${world.tick}`,
      contributors,
      insight: insightTypes[Math.floor(Math.random() * insightTypes.length)] ?? 'unknown',
      combinedIntelligence: swarmIQ,
      emergenceScore: emergenceBonus,
      tick: world.tick,
    });
  }

  const beliefSimilarity = entities.length > 1
    ? entities.reduce((s, e, _, arr) => {
      const other = arr.find(a => a.id !== e.id);
      return s + (other ? (1 - Math.abs((e.traits['ideology'] ?? 0.5) - (other.traits['ideology'] ?? 0.5))) : 0);
    }, 0) / (entities.length * (entities.length - 1) || 1)
    : 1;

  const consensusReached = beliefSimilarity > 0.8;

  return { insights: insights.slice(-20), swarmIQ, consensusReached, diversity };
}

export function poolKnowledge(state: CollectiveIntelligenceState, entityIds: string[]): number {
  const relevantInsights = state.insights.filter(i => i.contributors.some(c => entityIds.includes(c)));
  return relevantInsights.reduce((s, i) => s + i.emergenceScore, 0);
}
