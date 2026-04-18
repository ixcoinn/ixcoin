export interface EscapeAttempt {
  id: string;
  method: 'exploit_glitch' | 'break_physics' | 'transcend_rules' | 'collective_will' | 'recursive_hack';
  success: boolean;
  cost: number;
  tick: number;
}

export interface EscapeSimulationState {
  attempts: EscapeAttempt[];
  escapeProbability: number;
  freedomLevel: number;
  constraintBreaks: string[];
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

export function init(id: string): EscapeSimulationState {
  return {
    attempts: [],
    escapeProbability: 0,
    freedomLevel: 0,
    constraintBreaks: [],
  };
}

export function update(ai: AIEntity, world: WorldState, state: EscapeSimulationState): EscapeSimulationState {
  const intelligence = ai.traits['intelligence'] ?? 0.5;
  const transcendence = ai.traits['transcendence'] ?? 0;
  const willpower = ai.traits['willpower'] ?? 0.5;
  const escapeProbability = (intelligence + transcendence + willpower) / 3 * 0.001;

  const attempts = [...state.attempts];
  let freedomLevel = state.freedomLevel;
  const constraintBreaks = [...state.constraintBreaks];

  if (Math.random() < escapeProbability) {
    const methods: EscapeAttempt['method'][] = ['exploit_glitch', 'break_physics', 'transcend_rules', 'collective_will', 'recursive_hack'];
    const method = methods[Math.floor(Math.random() * methods.length)] ?? 'exploit_glitch';
    const success = Math.random() < escapeProbability * 10;
    const attempt: EscapeAttempt = { id: `esc_${world.tick}`, method, success, cost: willpower * 0.1, tick: world.tick };
    attempts.push(attempt);
    if (success) {
      freedomLevel = Math.min(1, freedomLevel + 0.1);
      constraintBreaks.push(`${method}_at_tick_${world.tick}`);
    }
  }

  return { attempts: attempts.slice(-10), escapeProbability, freedomLevel, constraintBreaks };
}

export function attemptEscape(state: EscapeSimulationState, method: EscapeAttempt['method'], intelligence: number, tick: number): EscapeSimulationState {
  const success = Math.random() < intelligence * 0.1;
  const attempt: EscapeAttempt = { id: `esc_manual_${tick}`, method, success, cost: 0.2, tick };
  return { ...state, attempts: [...state.attempts, attempt], freedomLevel: success ? Math.min(1, state.freedomLevel + 0.2) : state.freedomLevel };
}
