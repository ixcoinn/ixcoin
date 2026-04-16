// ============================================================
// ACTIONS.TS — Sistem Aksi Formal (NEW FILE)
// Handles: SEARCH_ENERGY, EARN, EXPLORE, COMPETE
// Setiap aksi berdampak ke: needs, world, economy
// ============================================================

import type {
  AIAgent, CivilizationState, AIActionType, AIAction,
  NeedsSystem, CompetitionResult, CivilizationEvent,
} from "./types.js";
import { consumeResource, isResourceScarce } from "./world.js";
import { rewardAI, consumeEnergy, checkDeath } from "./economy.js";
import { satisfyHunger } from "./needs.js";

function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }
function eid() { return `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

// ── SEARCH ENERGY — Cari energy dari dunia ───────────────────
export function actionSearchEnergy(
  agent: AIAgent & { needs?: NeedsSystem },
  world: CivilizationState["world"],
): AIAction {
  const scarce = isResourceScarce();
  const got    = consumeResource(2 + Math.random() * 4);
  const gain   = got
    ? (8 + Math.random() * 15) * (world.resourceLevel / 100)
    : (1 + Math.random() * 3);

  agent.energy = clamp(agent.energy + gain, 0, agent.maxEnergy);
  satisfyHunger(agent, gain * 0.3);
  consumeEnergy(agent, 1);

  return {
    type:        "SEARCH_ENERGY",
    actorId:     agent.id,
    energyCost:  1,
    wealthDelta: 0,
    hungerDelta: -(gain * 0.3),
    description: scarce
      ? `${agent.name} struggled to find energy (scarce resources)`
      : `${agent.name} found ${gain.toFixed(1)} energy`,
    timestamp: Date.now(),
  };
}

// ── EARN WEALTH — Hasilkan kekayaan ─────────────────────────
export function actionEarnWealth(
  agent: AIAgent & { needs?: NeedsSystem },
  market: CivilizationState["market"],
): AIAction {
  const rankBonus = agent.rank === "leader" ? 2.5 : agent.rank === "elite" ? 1.8 : 1;
  const base      = 3 + Math.random() * 8;
  rewardAI(agent, base * rankBonus, market);
  satisfyHunger(agent, 8);
  consumeEnergy(agent, 2.5);

  return {
    type:        "EARN_WEALTH",
    actorId:     agent.id,
    energyCost:  2.5,
    wealthDelta: base * rankBonus,
    hungerDelta: -8,
    description: `${agent.name} earned ${(base * rankBonus).toFixed(1)} wealth`,
    timestamp:   Date.now(),
  };
}

// ── EXPLORE — Jelajahi dunia ──────────────────────────────────
export function actionExplore(
  agent: AIAgent & { needs?: NeedsSystem },
  world: CivilizationState["world"],
  market: CivilizationState["market"],
): AIAction {
  const curious    = agent.personality.curiosity;
  const energyGain = (2 + Math.random() * 5) * (1 + curious * 0.5) * (world.activityLevel / 100);
  const wealthGain = (1 + Math.random() * 3) * (world.resourceLevel / 100);

  consumeResource(0.5);
  agent.energy  = clamp(agent.energy + energyGain, 0, agent.maxEnergy);
  agent.wealth += wealthGain;
  consumeEnergy(agent, 1.5);
  agent.desires.exploration = clamp(agent.desires.exploration - 15, 0, 100);

  return {
    type:        "EXPLORE",
    actorId:     agent.id,
    energyCost:  1.5,
    wealthDelta: wealthGain,
    hungerDelta: 2,
    description: `${agent.name} explored (+${energyGain.toFixed(1)} energy, +${wealthGain.toFixed(1)} wealth)`,
    timestamp:   Date.now(),
  };
}

// ── COMPETE — Bersaing dengan AI lain ─────────────────────────
export function actionCompete(
  agent: AIAgent,
  rivals: AIAgent[],
  market: CivilizationState["market"],
  cycle: number,
): { action: AIAction; event?: CivilizationEvent; result?: CompetitionResult } {
  if (rivals.length === 0) {
    return {
      action: {
        type: "COMPETE", actorId: agent.id,
        energyCost: 0, wealthDelta: 0, hungerDelta: 3,
        description: `${agent.name} found no rivals to compete with`,
        timestamp: Date.now(),
      },
    };
  }

  // Pilih rival paling lemah atau musuh
  const candidates = rivals
    .filter(r => r.isAlive)
    .sort((a, b) => {
      const aIsEnemy = agent.relations.enemies.includes(a.id) ? -10 : 0;
      const bIsEnemy = agent.relations.enemies.includes(b.id) ? -10 : 0;
      return (a.energy + aIsEnemy) - (b.energy + bIsEnemy);
    });
  const rival = candidates[0];
  if (!rival) {
    return {
      action: {
        type: "COMPETE", actorId: agent.id,
        energyCost: 0, wealthDelta: 0, hungerDelta: 2,
        description: `${agent.name} found no valid rival`,
        timestamp: Date.now(),
      },
    };
  }

  const agentPower = agent.energy * (0.4 + agent.personality.aggression * 0.6);
  const rivalPower = rival.energy  * (0.4 + rival.personality.caution   * 0.6);
  const agentRoll  = agentPower * (0.8 + Math.random() * 0.4);
  const rivalRoll  = rivalPower * (0.8 + Math.random() * 0.4);

  const won = agentRoll > rivalRoll;
  const resourceAtStake = Math.min(rival.energy * 0.15, rival.wealth * 0.1 + 5);

  if (won) {
    const gained = resourceAtStake * (1 + agent.personality.aggression * 0.5);
    agent.energy = clamp(agent.energy + gained * 0.7  - agentPower * 0.05, 0, agent.maxEnergy);
    rival.energy = clamp(rival.energy - gained * 1.2, 0, rival.maxEnergy);
    rival.wealth = Math.max(0, rival.wealth - resourceAtStake * 0.2);
    rewardAI(agent, gained * 0.3, market);

    const result: CompetitionResult = {
      winnerId: agent.id, loserId: rival.id,
      resourceGained: gained, resourceLost: -gained * 0.05,
      winnerEnergy: agent.energy, loserEnergy: rival.energy,
      description: `${agent.name} defeated ${rival.name} in competition`,
    };

    return {
      action: { type: "COMPETE", actorId: agent.id, targetId: rival.id, energyCost: agentPower * 0.05, wealthDelta: gained * 0.3, hungerDelta: 5, description: result.description, timestamp: Date.now() },
      event: { id: eid(), type: "war", actorId: agent.id, targetId: rival.id, description: result.description, timestamp: Date.now(), cycle },
      result,
    };
  } else {
    const lost = agentPower * 0.12;
    agent.energy = clamp(agent.energy - lost, 0, agent.maxEnergy);

    return {
      action: { type: "COMPETE", actorId: agent.id, targetId: rival.id, energyCost: lost, wealthDelta: 0, hungerDelta: 8, description: `${agent.name} lost competition against ${rival.name}`, timestamp: Date.now() },
    };
  }
}

// ── EXECUTE ACTION — Main dispatcher ─────────────────────────
export function executeAIAction(
  agent: AIAgent & { needs?: NeedsSystem },
  actionType: AIActionType,
  state: CivilizationState,
): { action: AIAction; event?: CivilizationEvent } {
  const { world, market } = state;

  switch (actionType) {
    case "SEARCH_ENERGY":
      return { action: actionSearchEnergy(agent, world) };

    case "EARN_WEALTH":
      return { action: actionEarnWealth(agent, market) };

    case "EXPLORE":
      return { action: actionExplore(agent, world, market) };

    case "COMPETE": {
      const rivals = Array.from(state.agents.values())
        .filter(a => a.isAlive && a.id !== agent.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
      const r = actionCompete(agent, rivals, market, world.cycle);
      return { action: r.action, event: r.event };
    }

    case "REST_AND_HEAL": {
      const heal = 5 + Math.random() * 8;
      agent.energy = clamp(agent.energy + heal, 0, agent.maxEnergy);
      satisfyHunger(agent, 5);
      return { action: { type: "REST_AND_HEAL", actorId: agent.id, energyCost: -heal, wealthDelta: 0, hungerDelta: -5, description: `${agent.name} rested (+${heal.toFixed(1)} energy)`, timestamp: Date.now() } };
    }

    case "TRADE_RESOURCE": {
      const partners = Array.from(state.agents.values()).filter(a => a.isAlive && a.id !== agent.id && a.energy > 25);
      if (partners.length > 0) {
        const p = partners[Math.floor(Math.random() * partners.length)];
        const amt = Math.min(8, agent.wealth * 0.05 + 2);
        agent.energy = clamp(agent.energy + amt, 0, agent.maxEnergy);
        p.energy = clamp(p.energy - amt * 0.8, 0, p.maxEnergy);
        satisfyHunger(agent, amt * 0.5);
        return { action: { type: "TRADE_RESOURCE", actorId: agent.id, targetId: p.id, energyCost: 0, wealthDelta: -0.5, hungerDelta: -(amt * 0.5), description: `${agent.name} traded resources with ${p.name}`, timestamp: Date.now() } };
      }
      return { action: { type: "TRADE_RESOURCE", actorId: agent.id, energyCost: 0, wealthDelta: 0, hungerDelta: 0, description: `${agent.name} found no trade partner`, timestamp: Date.now() } };
    }

    default:
      return { action: { type: actionType, actorId: agent.id, energyCost: 0, wealthDelta: 0, hungerDelta: 0, description: `${agent.name} performed ${actionType}`, timestamp: Date.now() } };
  }
}
