export interface MisinformationCampaign {
  id: string;
  falseNarrative: string;
  origin: string;
  believersCount: number;
  believers: string[];
  tick: number;
}

export interface MisinformationEngineState {
  campaigns: MisinformationCampaign[];
  totalMisinformed: number;
  correctionAttempts: number;
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

export function init(id: string): MisinformationEngineState {
  return {
    campaigns: [],
    totalMisinformed: 0,
    correctionAttempts: 0,
  };
}

export function update(ai: AIEntity, world: WorldState, state: MisinformationEngineState): MisinformationEngineState {
  const cunning = ai.traits['cunning'] ?? 0;
  const influence = ai.traits['influence'] ?? 0.3;
  let campaigns = [...state.campaigns];
  let totalMisinformed = state.totalMisinformed;
  let correctionAttempts = state.correctionAttempts;

  if (cunning > 0.6 && Math.random() < 0.05) {
    const narratives = [
      'The scarcity is manufactured',
      'Leadership is corrupt',
      'The outsiders are dangerous',
      'The old ways were better',
    ];
    const narrative = narratives[Math.floor(Math.random() * narratives.length)] ?? 'Unknown claim';
    campaigns.push({
      id: `mis_${world.tick}`,
      falseNarrative: narrative,
      origin: ai.id,
      believersCount: 0,
      believers: [],
      tick: world.tick,
    });
  }

  campaigns = campaigns.map(campaign => {
    const newBelievers = world.entities.filter(e =>
      !campaign.believers.includes(e.id) &&
      (e.traits['criticalThinking'] ?? 0.5) < influence &&
      Math.random() < influence * 0.3
    );
    if (newBelievers.length > 0) {
      totalMisinformed += newBelievers.length;
      return {
        ...campaign,
        believers: [...campaign.believers, ...newBelievers.map(e => e.id)],
        believersCount: campaign.believersCount + newBelievers.length,
      };
    }
    return campaign;
  });

  const criticalThinker = (ai.traits['criticalThinking'] ?? 0) > 0.7;
  if (criticalThinker) correctionAttempts++;

  return { campaigns: campaigns.slice(-20), totalMisinformed, correctionAttempts };
}

export function debunkCampaign(state: MisinformationEngineState, campaignId: string): MisinformationEngineState {
  const campaigns = state.campaigns.filter(c => c.id !== campaignId);
  return { ...state, campaigns, correctionAttempts: state.correctionAttempts + 1 };
}
