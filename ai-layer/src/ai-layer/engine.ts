// ============================================================
  // ENGINE.TS — Decision Engine (Original + Upgraded)
  // Used by: civilization.ts (DB-backed) + loop.ts (live)
  // ============================================================

  import type {
    AiRole, AiPersonality, AiState, EcosystemEnvironment,
    DecisionContext, AiDecision,
    AIAgent, LiveDecisionContext, ActionType, PrimaryGoal, Ideology, WorldState,
  } from "./types.js";

  // ── ORIGINAL ENGINE CONSTANTS ────────────────────────────────
  const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2500, 4000, 6000, 9000];
  const ENERGY_DECAY_PER_CYCLE = 5;
  const ENERGY_GAIN_FROM_ACTION = 12;
  const MAX_POOL = 5_000_000;

  export function getLevelFromExp(exp: number): number {
    let level = 1;
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      if (exp >= LEVEL_THRESHOLDS[i]) level = i + 1;
      else break;
    }
    return level;
  }

  function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
  }

  function randomInRange(min: number, max: number) {
    return min + Math.random() * (max - min);
  }

  function getNetworkPressure(env: EcosystemEnvironment): "quiet" | "normal" | "busy" | "overcrowded" {
    if (env.networkActivity < 0.2) return "quiet";
    if (env.networkActivity < 0.5) return "normal";
    if (env.networkActivity < 0.8) return "busy";
    return "overcrowded";
  }

  function getPoolHealth(env: EcosystemEnvironment): "critical" | "low" | "healthy" | "abundant" {
    const ratio = 1 - (env.distributedTotal / MAX_POOL);
    if (ratio < 0.05) return "critical";
    if (ratio < 0.2) return "low";
    if (ratio < 0.7) return "healthy";
    return "abundant";
  }

  function getPersonalityMultiplier(personality: AiPersonality, pressure: string): number {
    const matrix: Record<AiPersonality, Record<string, number>> = {
      aggressive:   { quiet: 1.5, normal: 1.2, busy: 0.9, overcrowded: 0.7 },
      cautious:     { quiet: 0.8, normal: 0.9, busy: 1.1, overcrowded: 1.3 },
      balanced:     { quiet: 1.0, normal: 1.0, busy: 1.0, overcrowded: 1.0 },
      adaptive:     { quiet: 1.3, normal: 1.1, busy: 0.85, overcrowded: 0.75 },
    };
    return matrix[personality][pressure] ?? 1.0;
  }

  function applyFeedbackLoop(
    baseReward: number,
    recentMemory: Array<{ eventType: string; impact: number }>,
  ): number {
    if (recentMemory.length === 0) return baseReward;
    const avgImpact = recentMemory.slice(-5).reduce((s, m) => s + m.impact, 0) / recentMemory.slice(-5).length;
    const correction = avgImpact > 0.5 ? 0.85 : avgImpact > 0 ? 0.95 : 1.05;
    return baseReward * correction;
  }

  function guardianDecision(ctx: DecisionContext): AiDecision {
    const pressure = getNetworkPressure(ctx.environment);
    const poolHealth = getPoolHealth(ctx.environment);
    let baseReward = 0;
    let actionType = "STABILITY_CHECK";
    let decision = "maintaining network stability";
    let outcome = "stable";
    if (poolHealth === "critical") {
      baseReward = 0; actionType = "POOL_PROTECTION";
      decision = "emergency pool protection — halting reward distribution"; outcome = "emergency_halt";
    } else if (pressure === "overcrowded") {
      baseReward = randomInRange(0.2, 0.8); actionType = "THROTTLE";
      decision = "throttling rewards — network overcrowded"; outcome = "throttled";
    } else if (pressure === "quiet") {
      baseReward = randomInRange(1.5, 3.0); actionType = "BOOST";
      decision = "boosting rewards — stimulating quiet network"; outcome = "boosted";
    } else {
      baseReward = randomInRange(0.8, 1.5); actionType = "MAINTAIN";
      decision = "maintaining standard reward rate"; outcome = "stable";
    }
    const personalityMult = getPersonalityMultiplier(ctx.ai.personality, pressure);
    const levelBonus = 1 + (ctx.ai.level - 1) * 0.05;
    const rewardWithFeedback = applyFeedbackLoop(baseReward * personalityMult * levelBonus, ctx.recentMemory);
    const finalReward = clamp(rewardWithFeedback, 0, 5.0);
    return { actionType, decision, recommendedReward: finalReward // [FIX] hanya rekomendasi — bukan reward final, belum melalui PoW, energyCost: 8, expGained: 5 + ctx.ai.level * 2, outcome, metadata: { pressure, poolHealth, personalityMult, levelBonus } };
  }

  function optimizerDecision(ctx: DecisionContext): AiDecision {
    const pressure = getNetworkPressure(ctx.environment);
    const poolHealth = getPoolHealth(ctx.environment);
    const levelBonus = 1 + (ctx.ai.level - 1) * 0.08;
    let baseReward = randomInRange(1.0, 2.5) * levelBonus;
    let actionType = "OPTIMIZE";
    let decision = "optimizing reward distribution";
    let outcome = "optimized";
    if (poolHealth === "critical" || poolHealth === "low") {
      baseReward *= 0.4; actionType = "CONSERVE";
      decision = "conserving pool — switching to low-output mode"; outcome = "conserved";
    } else if (ctx.environment.activeAiCount > 5) {
      baseReward *= 0.7; actionType = "COMPETE";
      decision = "competing for reward allocation"; outcome = "competed";
    } else {
      baseReward *= 1.2; actionType = "MAXIMIZE";
      decision = "maximizing reward throughput"; outcome = "maximized";
    }
    const personalityMult = getPersonalityMultiplier(ctx.ai.personality, pressure);
    const finalReward = clamp(applyFeedbackLoop(baseReward * personalityMult, ctx.recentMemory), 0, 8.0);
    return { actionType, decision, recommendedReward: finalReward // [FIX] hanya rekomendasi — bukan reward final, belum melalui PoW, energyCost: 10, expGained: 8 + ctx.ai.level * 3, outcome, metadata: { pressure, poolHealth, levelBonus, personalityMult } };
  }

  function balancerDecision(ctx: DecisionContext): AiDecision {
    const pressure = getNetworkPressure(ctx.environment);
    const poolHealth = getPoolHealth(ctx.environment);
    const imbalance = Math.abs(ctx.environment.networkActivity - 0.5);
    let baseReward = randomInRange(0.5, 1.5);
    let actionType = "BALANCE";
    let decision = "balancing ecosystem";
    let outcome = "balanced";
    if (imbalance > 0.3) {
      baseReward = randomInRange(1.5, 3.0); actionType = "REBALANCE";
      decision = "emergency rebalancing — high imbalance detected"; outcome = "rebalanced";
    } else if (poolHealth === "abundant") {
      baseReward = randomInRange(1.0, 2.0); actionType = "DISTRIBUTE";
      decision = "distributing excess from abundant pool"; outcome = "distributed";
    }
    const personalityMult = getPersonalityMultiplier(ctx.ai.personality, pressure);
    const levelBonus = 1 + (ctx.ai.level - 1) * 0.06;
    const finalReward = clamp(applyFeedbackLoop(baseReward * personalityMult * levelBonus, ctx.recentMemory), 0, 6.0);
    return { actionType, decision, recommendedReward: finalReward // [FIX] hanya rekomendasi — bukan reward final, belum melalui PoW, energyCost: 7, expGained: 6 + ctx.ai.level * 2, outcome, metadata: { pressure, poolHealth, imbalance, personalityMult } };
  }

  export function makeDecision(ctx: DecisionContext): AiDecision | null {
    if (!ctx.ai.isActive || ctx.ai.energy < 5) return null;
    switch (ctx.ai.role) {
      case "guardian": return guardianDecision(ctx);
      case "optimizer": return optimizerDecision(ctx);
      case "balancer": return balancerDecision(ctx);
    }
  }

  export function applyEnergyDecay(currentEnergy: number): number {
    return Math.max(0, currentEnergy - ENERGY_DECAY_PER_CYCLE);
  }

  export function applyEnergyGain(currentEnergy: number, maxEnergy: number): number {
    return Math.min(maxEnergy, currentEnergy + ENERGY_GAIN_FROM_ACTION);
  }

  export function calculateNetworkActivity(activeCount: number, cycleCount: number): number {
    const baseActivity = Math.min(1.0, activeCount / 10);
    const cycleFactor = Math.sin(cycleCount * 0.1) * 0.1;
    return clamp(baseActivity + cycleFactor + (Math.random() - 0.5) * 0.05, 0.05, 1.0);
  }

  export function getMaxEnergyForLevel(level: number): number {
    return 100 + (level - 1) * 20;
  }

  export function generateAiId(role: AiRole, index: number): string {
    const prefix = { guardian: "GRD", optimizer: "OPT", balancer: "BAL" }[role];
    return `${prefix}-${String(index).padStart(4, "0")}`;
  }

  // ── NEW LIVE ENGINE — Goal + Desire + Personality + World ────

  function randomGaussian(mean: number, stddev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1 + 0.0001)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stddev;
  }

  function weightedRandom<T>(items: { value: T; weight: number }[]): T {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) return item.value;
    }
    return items[items.length - 1].value;
  }

  function getEnergyUrgency(agent: AIAgent): number {
    const ratio = agent.energy / agent.maxEnergy;
    if (ratio < 0.15) return 3.0;
    if (ratio < 0.3) return 2.0;
    if (ratio < 0.5) return 1.4;
    if (ratio > 0.85) return 0.7;
    return 1.0;
  }

  function getGoalWeights(goal: PrimaryGoal, agent: AIAgent): Record<ActionType, number> {
    const base: Record<ActionType, number> = { trade: 1, cooperate: 1, attack: 1, ignore: 1, explore: 1, rest: 1, recruit: 1, betray: 0.1 };
    switch (goal) {
      case "survive": base.rest = 2.5; base.trade = 1.8; base.cooperate = 1.5; base.attack = 0.3; base.explore = 0.6; break;
      case "grow": base.trade = 2.2; base.explore = 2.0; base.cooperate = 1.5; base.recruit = 2.0; base.attack = 0.8; break;
      case "dominate": base.attack = 2.5; base.recruit = 2.0; base.betray = 0.6; base.cooperate = 0.5; base.trade = 0.7; break;
      case "cooperate": base.cooperate = 3.0; base.trade = 2.2; base.attack = 0.1; base.betray = 0.05; base.recruit = 1.5; break;
    }
    if (agent.energy < agent.maxEnergy * 0.3) { base.rest *= 2; base.trade *= 1.5; base.attack *= 0.5; }
    return base;
  }

  function getIdeologyMods(ideology: Ideology): Record<ActionType, number> {
    const m: Record<ActionType, number> = { trade: 1, cooperate: 1, attack: 1, ignore: 1, explore: 1, rest: 1, recruit: 1, betray: 1 };
    switch (ideology) {
      case "aggressive": m.attack = 1.8; m.betray = 1.5; m.cooperate = 0.5; m.trade = 0.7; break;
      case "cooperative": m.cooperate = 1.9; m.trade = 1.6; m.attack = 0.3; m.betray = 0.1; break;
      case "expansionist": m.explore = 1.7; m.recruit = 1.8; m.trade = 1.3; m.attack = 1.2; break;
      case "defensive": m.rest = 1.6; m.ignore = 1.5; m.attack = 0.6; m.explore = 0.7; break;
    }
    return m;
  }

  function selectLiveTarget(agent: AIAgent, action: ActionType, candidates: AIAgent[]): AIAgent | undefined {
    if (candidates.length === 0) return undefined;
    const scored = candidates.map((c) => {
      let score = Math.random() * 0.5;
      if (action === "attack") {
        if (agent.relations.enemies.includes(c.id)) score += 2.0;
        if (agent.relations.friends.includes(c.id)) score -= 3.0;
        score += (1 - c.energy / c.maxEnergy) * 1.5;
      } else if (action === "trade" || action === "cooperate") {
        if (agent.relations.friends.includes(c.id)) score += 2.0;
        if (agent.relations.enemies.includes(c.id)) score -= 2.0;
        score += c.reputation.trustScore * 0.02;
      } else if (action === "recruit") {
        if (c.groupId) score -= 1.5;
        score += c.wealth * 0.01;
      }
      return { c, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, Math.min(3, scored.length));
    return weightedRandom(top.map((s) => ({ value: s.c, weight: Math.max(0.1, s.score) })));
  }

  export function liveDecide(ctx: LiveDecisionContext): { action: ActionType; targetId?: string; reasoning: string } {
    const { agent, world, nearbyAgents } = ctx;
    const alive = nearbyAgents.filter((a) => a.isAlive && a.id !== agent.id);
    const goalW = getGoalWeights(agent.goals.primaryGoal, agent);
    const ideologyM = getIdeologyMods(agent.ideology);
    const urgency = getEnergyUrgency(agent);

    const actions: ActionType[] = ["trade", "cooperate", "attack", "ignore", "explore", "rest", "recruit", "betray"];
    const weighted: { action: ActionType; weight: number; targetId?: string }[] = [];

    for (const action of actions) {
      if (["trade", "cooperate", "attack", "recruit", "betray"].includes(action) && alive.length === 0) continue;

      let w = goalW[action] * ideologyM[action];
      w += agent.desires.energy * 0.01 * (action === "rest" || action === "trade" ? 1 : 0);
      w += agent.desires.power * 0.01 * (action === "attack" ? 1 : 0);
      w += agent.desires.social * 0.01 * (action === "cooperate" || action === "trade" ? 1 : 0);
      w += agent.desires.exploration * 0.01 * (action === "explore" ? 1 : 0);
      if (action === "rest") w *= urgency;
      if (action === "attack" || action === "betray") w *= urgency < 1 ? urgency : 1;
      w *= world.dangerLevel > 70 && action === "attack" ? (agent.ideology === "aggressive" ? 1.4 : 0.6) : 1;
      w *= world.resourceLevel < 30 && (action === "trade" || action === "rest") ? 1.3 : 1;
      w = clamp(w * (0.85 + Math.random() * 0.3), 0.01, 10);

      let targetId: string | undefined;
      if (["trade", "cooperate", "attack", "recruit", "betray"].includes(action)) {
        const target = selectLiveTarget(agent, action, alive);
        if (!target) continue;
        targetId = target.id;
      }
      weighted.push({ action, weight: w, targetId });
    }

    if (weighted.length === 0) return { action: "rest", reasoning: "no_options" };
    const chosen = weightedRandom(weighted.map((wa) => ({ value: wa, weight: wa.weight })));
    return { action: chosen.action, targetId: chosen.targetId, reasoning: `goal=${agent.goals.primaryGoal} ideology=${agent.ideology} w=${chosen.weight.toFixed(2)}` };
  }

  export function updateDesires(agent: AIAgent): void {
    const ratio = agent.energy / agent.maxEnergy;
    agent.desires.energy = clamp(randomGaussian(100 - ratio * 100, 5), 0, 100);
    if (agent.lastAction === "cooperate" || agent.lastAction === "trade") {
      agent.desires.social = clamp(agent.desires.social - 10, 0, 100);
    } else { agent.desires.social = clamp(agent.desires.social + 3, 0, 100); }
    if (agent.lastAction === "attack" && agent.energy > agent.maxEnergy * 0.5) {
      agent.desires.power = clamp(agent.desires.power + 5, 0, 100);
    } else { agent.desires.power = clamp(agent.desires.power - 2, 0, 100); }
    if (agent.lastAction === "explore") {
      agent.desires.exploration = clamp(agent.desires.exploration - 15, 0, 100);
    } else { agent.desires.exploration = clamp(agent.desires.exploration + 4, 0, 100); }
  }

  export function updateGoalPriority(agent: AIAgent, world: WorldState): void {
    const ratio = agent.energy / agent.maxEnergy;
    if (ratio < 0.2) { agent.goals.primaryGoal = "survive"; agent.goals.priorityLevel = 10; return; }
    if (world.dangerLevel > 80 && agent.ideology === "defensive" && agent.goals.primaryGoal !== "survive") {
      agent.goals.secondaryGoals.push(`prev:${agent.goals.primaryGoal}`);
      agent.goals.primaryGoal = "survive"; return;
    }
    if (agent.rank === "leader" && agent.goals.primaryGoal !== "dominate" && Math.random() < 0.1 + agent.desires.power * 0.003) {
      agent.goals.primaryGoal = "dominate";
    }
    agent.goals.priorityLevel = clamp(agent.goals.priorityLevel + (Math.random() > 0.7 ? 1 : -1), 1, 10);
  }
  
// ============================================================
// UPGRADE: ENGINE — decideAction() formal wrapper
// Maps existing liveDecide → AIActionType
// Appended — NO original code removed
// ============================================================

import type { AIActionType, NeedsSystem, AIGoal } from "./types.js";

// ── MAP ActionType → AIActionType ────────────────────────────
function mapToAIActionType(action: ActionType, agent: AIAgent, world: WorldState): AIActionType {
  // Energy kritis → SEARCH_ENERGY paksa
  if (agent.energy < agent.maxEnergy * 0.2) return "SEARCH_ENERGY";
  switch (action) {
    case "rest":      return "REST_AND_HEAL";
    case "explore":   return "EXPLORE";
    case "trade":     return "TRADE_RESOURCE";
    case "cooperate": return "RECRUIT_ALLY";
    case "attack":    return "COMPETE";
    case "betray":    return "BETRAY_ENEMY";
    case "recruit":   return "RECRUIT_ALLY";
    case "ignore":
    default:
      // Wealth rendah → EARN
      if (agent.wealth < 20) return "EARN_WEALTH";
      // Resource dunia langka → COMPETE
      if (world.resourceLevel < 25) return "COMPETE";
      return "EXPLORE";
  }
}

// ── DECIDE ACTION — Wrapper resmi untuk AI ───────────────────
export function decideAction(
  agent: AIAgent,
  world: WorldState,
  nearbyAgents: AIAgent[],
): AIActionType {
  if (!agent.isAlive) return "REST_AND_HEAL";

  // Panggil liveDecide yang sudah ada untuk logika penuh
  const ctx: LiveDecisionContext = {
    agent, world,
    market: { energyPrice: 1, supplyLevel: 50, demandLevel: 50, recentTrades: 0, priceHistory: [], volatility: 0.1 },
    nearbyAgents,
  };
  const dec = liveDecide(ctx);
  return mapToAIActionType(dec.action, agent, world);
}

// ── GET FORMAL GOAL — Konversi PrimaryGoal → AIGoal enum ─────
export function getFormalGoal(agent: AIAgent): AIGoal {
  switch (agent.goals.primaryGoal) {
    case "survive":   return AIGoal.SURVIVE;
    case "grow":      return AIGoal.EXPAND;
    case "dominate":  return AIGoal.DOMINATE;
    case "cooperate": return AIGoal.EARN;
    default:          return AIGoal.SURVIVE;
  }
}

// ── EVALUATE NEEDS — Ukur urgensi kebutuhan AI ───────────────
export function evaluateNeeds(agent: AIAgent & { needs?: NeedsSystem }): {
  needsEnergy: boolean;
  needsWealth: boolean;
  needsFood:   boolean;
  urgencyLevel: "critical" | "high" | "normal" | "comfortable";
} {
  const energyRatio = agent.energy / agent.maxEnergy;
  const wealthOk    = (agent.needs?.wealth ?? agent.wealth) > 30;
  const hungry      = (agent.needs?.hunger ?? 0) > 60;

  let urgencyLevel: "critical" | "high" | "normal" | "comfortable";
  if (energyRatio < 0.15) urgencyLevel = "critical";
  else if (energyRatio < 0.35 || hungry) urgencyLevel = "high";
  else if (energyRatio < 0.65) urgencyLevel = "normal";
  else urgencyLevel = "comfortable";

  return {
    needsEnergy: energyRatio < 0.4,
    needsWealth: !wealthOk,
    needsFood:   hungry,
    urgencyLevel,
  };
}
