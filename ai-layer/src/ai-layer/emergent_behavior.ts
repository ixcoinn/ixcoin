export interface EmergentPattern {
  id: string;
  description: string;
  participatingEntities: string[];
  strength: number;
  predictable: boolean;
  tick: number;
}

export interface EmergentBehaviorState {
  patterns: EmergentPattern[];
  complexityLevel: number;
  emergenceThreshold: number;
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

export function init(id: string): EmergentBehaviorState {
  return {
    patterns: [],
    complexityLevel: 0,
    emergenceThreshold: 0.5,
  };
}

export function update(ai: AIEntity, world: WorldState, state: EmergentBehaviorState): EmergentBehaviorState {
  const complexityLevel = Math.min(1, (world.entities.length * 0.05) + (Object.keys(world.rules).length * 0.02));

  const patterns: EmergentPattern[] = [...state.patterns];
  if (complexityLevel > state.emergenceThreshold && Math.random() < complexityLevel * 0.1) {
    const participants = world.entities.slice(0, Math.min(3, world.entities.length)).map(e => e.id);
    const descriptions = [
      'Collective decision making without central authority',
      'Spontaneous resource sharing network',
      'Emergent hierarchy from peer interactions',
      'Collective intelligence exceeding individual capacity',
    ];
    patterns.push({
      id: `em_${world.tick}`,
      description: descriptions[Math.floor(Math.random() * descriptions.length)] ?? 'Unknown emergent pattern',
      participatingEntities: participants,
      strength: complexityLevel,
      predictable: complexityLevel < 0.5,
      tick: world.tick,
    });
  }

  return { patterns: patterns.slice(-15), complexityLevel, emergenceThreshold: state.emergenceThreshold };
}

export function detectPattern(state: EmergentBehaviorState, minStrength: number): EmergentPattern[] {
  return state.patterns.filter(p => p.strength >= minStrength);
}
