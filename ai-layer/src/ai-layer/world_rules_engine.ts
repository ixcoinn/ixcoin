export interface WorldRule {
  id: string;
  name: string;
  description: string;
  category: 'physics' | 'social' | 'economic' | 'metaphysical';
  active: boolean;
  enforceStrength: number;
  violatable: boolean;
}

export interface WorldRulesEngineState {
  rules: WorldRule[];
  activeRuleCount: number;
  ruleStability: number;
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

const DEFAULT_RULES: WorldRule[] = [
  { id: 'wr1', name: 'Conservation', description: 'Resources cannot be created or destroyed', category: 'physics', active: true, enforceStrength: 1.0, violatable: false },
  { id: 'wr2', name: 'Causality', description: 'Every effect has a cause', category: 'physics', active: true, enforceStrength: 0.95, violatable: false },
  { id: 'wr3', name: 'Reciprocity', description: 'Actions invite reactions', category: 'social', active: true, enforceStrength: 0.8, violatable: true },
  { id: 'wr4', name: 'Scarcity', description: 'Resources are finite', category: 'economic', active: true, enforceStrength: 0.9, violatable: false },
  { id: 'wr5', name: 'Emergence', description: 'Complex systems arise from simple interactions', category: 'metaphysical', active: true, enforceStrength: 1.0, violatable: false },
];

export function init(id: string): WorldRulesEngineState {
  return {
    rules: DEFAULT_RULES,
    activeRuleCount: DEFAULT_RULES.length,
    ruleStability: 1,
  };
}

export function update(ai: AIEntity, world: WorldState, state: WorldRulesEngineState): WorldRulesEngineState {
  const activeRuleCount = state.rules.filter(r => r.active).length;
  const ruleStability = activeRuleCount / Math.max(1, state.rules.length);
  return { ...state, activeRuleCount, ruleStability };
}

export function addRule(state: WorldRulesEngineState, rule: WorldRule): WorldRulesEngineState {
  return { ...state, rules: [...state.rules, rule] };
}

export function disableRule(state: WorldRulesEngineState, ruleId: string): WorldRulesEngineState {
  const rules = state.rules.map(r => r.id === ruleId && r.violatable ? { ...r, active: false } : r);
  return { ...state, rules };
}

export function checkViolation(state: WorldRulesEngineState, ruleId: string, magnitude: number): boolean {
  const rule = state.rules.find(r => r.id === ruleId);
  if (!rule || !rule.violatable) return false;
  return magnitude > rule.enforceStrength;
}
