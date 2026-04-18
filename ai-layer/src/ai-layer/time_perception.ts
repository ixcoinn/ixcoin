export interface TimePerceptionState {
  subjectiveTimeRate: number;
  perceivedAge: number;
  timeAnxiety: number;
  presentBias: number;
  futureOrientation: number;
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

export function init(id: string): TimePerceptionState {
  return {
    subjectiveTimeRate: 1,
    perceivedAge: 0,
    timeAnxiety: 0,
    presentBias: 0.5,
    futureOrientation: 0.5,
  };
}

export function update(ai: AIEntity, world: WorldState, state: TimePerceptionState): TimePerceptionState {
  const stress = ai.traits['stress'] ?? 0;
  const patience = ai.traits['patience'] ?? 0.5;
  const wisdom = ai.traits['wisdom'] ?? 0;

  const subjectiveTimeRate = stress > 0.7 ? 0.5 : stress < 0.2 ? 1.5 : 1;
  const perceivedAge = state.perceivedAge + subjectiveTimeRate;
  const timeAnxiety = Math.min(1, stress * (1 - patience));
  const presentBias = 1 - patience;
  const futureOrientation = Math.min(1, wisdom * 0.8 + patience * 0.2);

  return { subjectiveTimeRate, perceivedAge, timeAnxiety, presentBias, futureOrientation };
}

export function discountFuture(state: TimePerceptionState, futureValue: number, ticksAway: number): number {
  const discountRate = state.presentBias;
  return futureValue / Math.pow(1 + discountRate, ticksAway / 10);
}
