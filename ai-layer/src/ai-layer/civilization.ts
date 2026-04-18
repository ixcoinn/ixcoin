// ============================================================
// CIVILIZATION.TS — Upgraded: DB-backed + Group/Tribe System
// Terhubung ke: types.ts, engine.ts, interaction.ts
// ============================================================

import { db } from "../../lib/db/src/index.js";
import {
  aiEntitiesTable, aiMemoryTable, aiActionsTable, ecosystemStateTable,
  type AiEntity, type EcosystemState,
} from "../../lib/db/src/index.js";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import {
  makeDecision, getLevelFromExp, applyEnergyDecay, applyEnergyGain,
  calculateNetworkActivity, generateAiId, getMaxEnergyForLevel,
} from "./engine.js";
import { evaluateAllianceFormation, formAlliance } from "./interaction.js";
import type { AiState, EcosystemEnvironment, DecisionContext, AIAgent, Group, CivilizationEvent, Ideology } from "./types.js";

const RATE_LIMIT_MS = 5000;
let lastCycleTime = 0;
let isRunning = false;

export async function ensureInitialized(): Promise<void> {
  const state = await db.select().from(ecosystemStateTable).limit(1);
  if (state.length === 0) {
    await db.insert(ecosystemStateTable).values({ totalPool: 5_000_000, distributedTotal: 0, networkActivity: 0.5, currentRewardRate: 1.0, activeAiCount: 0, cycleCount: 0 });
    logger.info("Ecosystem state initialized");
  }
  const entities = await db.select().from(aiEntitiesTable).limit(1);
  if (entities.length === 0) await seedInitialAis();
}

async function seedInitialAis(): Promise<void> {
  const configs: Array<{ role: "guardian" | "optimizer" | "balancer"; personality: "aggressive" | "cautious" | "balanced" | "adaptive"; name: string }> = [
    { role: "guardian",  personality: "cautious",   name: "Aegis-Prime" },
    { role: "guardian",  personality: "balanced",   name: "Sentinel-VII" },
    { role: "optimizer", personality: "aggressive", name: "Apex-Engine" },
    { role: "optimizer", personality: "adaptive",   name: "Flux-Core" },
    { role: "balancer",  personality: "balanced",   name: "Equilibra" },
    { role: "balancer",  personality: "cautious",   name: "Harmonia" },
  ];
  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i];
    await db.insert(aiEntitiesTable).values({ aiId: generateAiId(cfg.role, i + 1), name: cfg.name, role: cfg.role, personality: cfg.personality, level: 1, experience: 0, energy: 100, maxEnergy: 100, isActive: 1 });
  }
  logger.info({ count: configs.length }, "Seeded initial AI entities");
}

export async function getEcosystemState(): Promise<EcosystemState | null> {
  const rows = await db.select().from(ecosystemStateTable).limit(1);
  return rows[0] ?? null;
}

export async function getAllAis(): Promise<AiEntity[]> {
  return db.select().from(aiEntitiesTable).orderBy(desc(aiEntitiesTable.level), desc(aiEntitiesTable.experience));
}

export async function getAiById(aiId: string): Promise<AiEntity | null> {
  const rows = await db.select().from(aiEntitiesTable).where(eq(aiEntitiesTable.aiId, aiId)).limit(1);
  return rows[0] ?? null;
}

export async function getRecentActions(limit = 20): Promise<typeof aiActionsTable.$inferSelect[]> {
  return db.select().from(aiActionsTable).orderBy(desc(aiActionsTable.createdAt)).limit(limit);
}

export async function getAiMemory(aiId: string, limit = 10): Promise<typeof aiMemoryTable.$inferSelect[]> {
  return db.select().from(aiMemoryTable).where(eq(aiMemoryTable.aiId, aiId)).orderBy(desc(aiMemoryTable.createdAt)).limit(limit);
}

export async function runCycle(): Promise<{ cycleId: number; actionsProcessed: number; totalReward: number } | null> {
  const now = Date.now();
  if (now - lastCycleTime < RATE_LIMIT_MS || isRunning) return null;
  isRunning = true; lastCycleTime = now;
  try {
    const ecosystemRows = await db.select().from(ecosystemStateTable).limit(1);
    if (!ecosystemRows[0]) return null;
    const ecosystem = ecosystemRows[0];
    const poolRemaining = ecosystem.totalPool - ecosystem.distributedTotal;
    if (poolRemaining <= 0) { logger.warn("Pool exhausted — AI cycle halted"); return null; }

    const entities = await db.select().from(aiEntitiesTable).where(eq(aiEntitiesTable.isActive, 1));
    const newCycle = ecosystem.cycleCount + 1;
    const networkActivity = calculateNetworkActivity(entities.length, newCycle);
    let totalReward = 0, actionsProcessed = 0;

    const aiStates: AiState[] = entities.map(e => ({ aiId: e.aiId, name: e.name, role: e.role as "guardian"|"optimizer"|"balancer", personality: e.personality as "aggressive"|"cautious"|"balanced"|"adaptive", level: e.level, experience: e.experience, energy: e.energy, maxEnergy: e.maxEnergy, isActive: e.isActive === 1 }));
    const env: EcosystemEnvironment = { totalPool: ecosystem.totalPool, distributedTotal: ecosystem.distributedTotal, networkActivity, currentRewardRate: ecosystem.currentRewardRate, activeAiCount: entities.length, cycleCount: newCycle };

    for (const entity of entities) {
      const aiState = aiStates.find(s => s.aiId === entity.aiId);
      if (!aiState) continue;
      const decayedEnergy = applyEnergyDecay(entity.energy);
      if (decayedEnergy < 5) { await db.update(aiEntitiesTable).set({ energy: decayedEnergy, updatedAt: new Date() }).where(eq(aiEntitiesTable.aiId, entity.aiId)); continue; }
      const recentMemoryRows = await db.select().from(aiMemoryTable).where(eq(aiMemoryTable.aiId, entity.aiId)).orderBy(desc(aiMemoryTable.createdAt)).limit(10);
      const competitors = aiStates.filter(s => s.aiId !== entity.aiId && s.role === entity.role);
      const ctx: DecisionContext = { ai: aiState, environment: env, recentMemory: recentMemoryRows.map(m => ({ eventType: m.eventType, impact: m.impact, createdAt: m.createdAt! })), competingAis: competitors };
      const decision = makeDecision(ctx);
      if (!decision) continue;
      const safeReward = Math.min(decision.recommendedReward, poolRemaining * 0.001);
      const newEnergy = applyEnergyGain(decayedEnergy - decision.energyCost, entity.maxEnergy);
      const newExp = entity.experience + decision.expGained;
      const newLevel = getLevelFromExp(newExp);
      await db.insert(aiActionsTable).values({ aiId: entity.aiId, actionType: decision.actionType, decision: decision.decision, recommendedReward: safeReward // [FIX] ini hanya rekomendasi AI, bukan reward final, energyCost: decision.energyCost, expGained: decision.expGained, networkActivity, poolRemaining, outcome: decision.outcome, metadata: decision.metadata });
      await db.insert(aiMemoryTable).values({ aiId: entity.aiId, eventType: decision.actionType, data: { decision: decision.decision, outcome: decision.outcome }, impact: safeReward > 1 ? 0.7 : 0.3 });
      await db.update(aiEntitiesTable).set({ energy: Math.max(0, newEnergy), experience: newExp, level: newLevel, maxEnergy: getMaxEnergyForLevel(newLevel), lastActionAt: new Date(), updatedAt: new Date() }).where(eq(aiEntitiesTable.aiId, entity.aiId));
      totalReward += safeReward; actionsProcessed++;
      env.distributedTotal += safeReward;
    }

    const smoothedRate = ecosystem.currentRewardRate * 0.7 + (actionsProcessed > 0 ? totalReward / actionsProcessed : ecosystem.currentRewardRate) * 0.3;
    await db.update(ecosystemStateTable).set({ distributedTotal: ecosystem.distributedTotal + totalReward, networkActivity, currentRewardRate: smoothedRate, activeAiCount: actionsProcessed, cycleCount: newCycle, lastCycleAt: new Date(), updatedAt: new Date() }).where(eq(ecosystemStateTable.id, ecosystem.id));
    logger.info({ cycleId: newCycle, actionsProcessed, totalReward: totalReward.toFixed(4) }, "AI cycle complete");
    return { cycleId: newCycle, actionsProcessed, totalReward };
  } catch (err) {
    logger.error({ err }, "Error in AI cycle");
    return null;
  } finally {
    isRunning = false;
  }
}

export async function getStats(): Promise<{ ecosystem: EcosystemState | null; entityCount: number; topAi: AiEntity | null; recentActions: typeof aiActionsTable.$inferSelect[] }> {
  const [ecosystem, entities, recentActions] = await Promise.all([getEcosystemState(), getAllAis(), getRecentActions(10)]);
  return { ecosystem, entityCount: entities.length, topAi: entities[0] ?? null, recentActions };
}

// ── GROUP / TRIBE SYSTEM ─────────────────────────────────────
const GROUP_NAMES = ["Iron Collective","Shadow Council","Dawn Syndicate","Void Faction","Neon Empire","Quantum Guild","Phantom Order","Cipher League","Storm Covenant","Binary Brotherhood","Helix Dynasty","Nexus Tribe","Apex Dominion","Prism Alliance","Echo Conclave","Vertex Union"];

export function createGroup(leaderId: string, ideology: Ideology, groupCount: number): Group {
  const name = GROUP_NAMES[groupCount % GROUP_NAMES.length];
  return { groupId: `group_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, name, members: [leaderId], leaderId, ideology, strength: 10, resources: 20, createdAt: Date.now(), warsWith: [], alliesWith: [], isActive: true };
}

export function addToGroup(agent: AIAgent, group: Group): void {
  if (!group.members.includes(agent.id)) { group.members.push(agent.id); agent.groupId = group.groupId; }
}

export function removeFromGroup(agent: AIAgent, group: Group): void {
  group.members = group.members.filter(id => id !== agent.id);
  agent.groupId = undefined;
  if (group.leaderId === agent.id) group.leaderId = group.members[0];
}

export function tryFormGroups(agents: AIAgent[], groups: Map<string, Group>, cycle: number): CivilizationEvent[] {
  const events: CivilizationEvent[] = [];
  const ungrouped = agents.filter(a => a.isAlive && !a.groupId && a.rank !== "normal");
  for (const leader of ungrouped) {
    if (Math.random() > 0.15) continue;
    const group = createGroup(leader.id, leader.ideology, groups.size);
    leader.groupId = group.groupId; leader.rank = "leader";
    const recruits = agents.filter(a => a.isAlive && !a.groupId && a.id !== leader.id && leader.relations.friends.includes(a.id));
    for (const r of recruits.slice(0, 5)) addToGroup(r, group);
    groups.set(group.groupId, group);
    events.push({ id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, type: "group_formed", actorId: leader.id, groupId: group.groupId, description: `${leader.name} formed ${group.name} with ${group.members.length} members`, timestamp: Date.now(), cycle });
  }
  return events;
}

export function processGroupConflicts(groups: Map<string, Group>, agents: Map<string, AIAgent>, cycle: number): CivilizationEvent[] {
  const events: CivilizationEvent[] = [];
  const active = Array.from(groups.values()).filter(g => g.isActive && g.members.length > 0);
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const A = active[i], B = active[j];
      if (A.alliesWith.includes(B.groupId)) continue;
      const conflict = (A.ideology === "aggressive" || B.ideology === "aggressive") && A.ideology !== B.ideology;
      if (!A.warsWith.includes(B.groupId) && conflict && Math.random() < 0.05) {
        A.warsWith.push(B.groupId); B.warsWith.push(A.groupId);
        events.push({ id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, type: "war", groupId: A.groupId, description: `WAR: ${A.name} vs ${B.name}`, timestamp: Date.now(), cycle });
      }
    }
  }
  return events;
}

export function balancePopulation(agents: Map<string, AIAgent>, min: number, max: number, cycle: number): { newAgents: AIAgent[]; events: CivilizationEvent[] } {
  const alive = Array.from(agents.values()).filter(a => a.isAlive);
  const newAgents: AIAgent[] = [];
  const events: CivilizationEvent[] = [];
  if (alive.length > max) {
    const weak = alive.filter(a => a.energy < 20 && a.rank === "normal").sort((a, b) => a.energy - b.energy);
    const cull = Math.min(alive.length - max, Math.floor(weak.length * 0.3));
    for (let i = 0; i < cull; i++) {
      if (weak[i]) { weak[i].isAlive = false; events.push({ id: `evt_${Date.now()}_${i}`, type: "death", actorId: weak[i].id, description: `${weak[i].name} died from overpopulation stress`, timestamp: Date.now(), cycle }); }
    }
  }
  return { newAgents, events };
}

// ============================================================
// UPGRADE: CIVILIZATION — Metrics, Tracking, Growth
// Appended — NO original code removed
// ============================================================

import type { CivilizationMetrics, AIGoal, CivilizationState } from "./types.js";

// ── GET CIVILIZATION METRICS — Snapshot lengkap peradaban ────
export function getCivilizationMetrics(state: CivilizationState): CivilizationMetrics {
const agents  = Array.from(state.agents.values());
const alive   = agents.filter(a => a.isAlive);
const prevCycle = state.world.cycle - 1;

// Hitung dominant goal
const goalCount: Record<string, number> = {};
for (const a of alive) goalCount[a.goals.primaryGoal] = (goalCount[a.goals.primaryGoal] || 0) + 1;
let dominantGoalStr: string | null = null;
let maxGoalCount = 0;
for (const [g, c] of Object.entries(goalCount)) {
  if (c > maxGoalCount) { maxGoalCount = c; dominantGoalStr = g; }
}

// Map PrimaryGoal → AIGoal enum
const mapGoal = (g: string | null): AIGoal | null => {
  if (!g) return null;
  switch (g) {
    case "survive":   return "SURVIVE"   as unknown as AIGoal;
    case "grow":      return "EXPAND"    as unknown as AIGoal;
    case "dominate":  return "DOMINATE"  as unknown as AIGoal;
    case "cooperate": return "EARN"      as unknown as AIGoal;
    default:          return null;
  }
};

// Growth rate (populasi hidup vs total)
const growthRate = alive.length > 0 ? alive.length / Math.max(1, agents.length) : 0;

// Economy volume dari wealth total
const economyVolume = alive.reduce((s, a) => s + a.wealth, 0);

// Conflict rate dari event log
const recentConflicts = state.eventLog.slice(-100).filter(e => e.type === "war").length;
const conflictRate    = recentConflicts / 100;

return {
  totalAlive:    alive.length,
  totalDead:     state.stats.totalDeaths,
  totalBorn:     state.world.birthCount,
  resourceUsage: state.world.tradeVolume,
  economyVolume,
  conflictRate,
  growthRate,
  dominantGoal:  mapGoal(dominantGoalStr),
  cycle:         state.world.cycle,
  timestamp:     Date.now(),
};
}

// ── UPDATE CIVILIZATION GROWTH — Update tracking tiap siklus ─
export function updateCivilizationGrowth(state: CivilizationState): void {
const alive = Array.from(state.agents.values()).filter(a => a.isAlive);
state.world.alivePopulation = alive.length;
if (alive.length > state.stats.peakPopulation) {
  state.stats.peakPopulation = alive.length;
}
}

// ── TRACK RESOURCE USAGE ─────────────────────────────────────
export function trackResourceUsage(state: CivilizationState, amount: number): void {
state.world.tradeVolume += amount;
}

// ── GET CIVILIZATION SUMMARY — Ringkasan singkat ─────────────
export function getCivilizationSummary(state: CivilizationState): string {
const m = getCivilizationMetrics(state);
return [
  `Cycle #${m.cycle}`,
  `Alive: ${m.totalAlive} | Dead: ${m.totalDead} | Born: ${m.totalBorn}`,
  `Economy: ${m.economyVolume.toFixed(0)} IXC | Conflict: ${(m.conflictRate * 100).toFixed(1)}%`,
  `Dominant Goal: ${m.dominantGoal ?? "none"} | Growth: ${(m.growthRate * 100).toFixed(1)}%`,
].join(" | ");
}
