// ============================================================
  // FACTORY.TS — Pembuatan Agent + Serialisasi State
  // Terhubung ke: types.ts, state.ts
  // ============================================================

  import type { AIAgent, CivilizationState, Ideology, PrimaryGoal } from "./types.js";
  import { createWorldState } from "./world.js";
  import { createMarketState } from "./economy.js";

  const NAMES = ["Alpha","Beta","Gamma","Delta","Epsilon","Zeta","Eta","Theta","Iota","Kappa","Lambda","Mu","Nu","Xi","Omicron","Pi","Rho","Sigma","Tau","Upsilon","Phi","Chi","Psi","Omega","Apex","Vex","Nyx","Orion","Lyra","Crux","Aeon","Flux","Helix","Nova","Echo","Prism","Cipher","Vortex","Nexus","Synapse","Cortex","Vector","Matrix","Quasar","Pulsar","Neutron","Photon","Proton"];
  const IDEOLOGIES: Ideology[] = ["aggressive","cooperative","expansionist","defensive"];
  const GOALS: PrimaryGoal[] = ["survive","grow","dominate","cooperate"];

  function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }

  export function createAgent(index: number, total: number): AIAgent {
    const id = `ai_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const name = NAMES[index % NAMES.length] + (index >= NAMES.length ? `-${Math.floor(index / NAMES.length)}` : "");
    const ideology = IDEOLOGIES[Math.floor(Math.random() * IDEOLOGIES.length)];
    const goal = GOALS[Math.floor(Math.random() * GOALS.length)];
    let agg = Math.random(), coop = Math.random(), cur = Math.random(), cau = Math.random();
    if (ideology === "aggressive") { agg = clamp(agg + 0.3, 0, 1); coop = clamp(coop - 0.2, 0, 1); }
    else if (ideology === "cooperative") { coop = clamp(coop + 0.3, 0, 1); agg = clamp(agg - 0.2, 0, 1); }
    else if (ideology === "expansionist") { cur = clamp(cur + 0.3, 0, 1); }
    else { cau = clamp(cau + 0.3, 0, 1); agg = clamp(agg - 0.15, 0, 1); }
    return {
      id, name, energy: 50 + Math.random() * 50, maxEnergy: 80 + Math.random() * 60,
      personality: { aggression: clamp(agg + (Math.random() - 0.5) * 0.2, 0, 1), cooperation: clamp(coop + (Math.random() - 0.5) * 0.2, 0, 1), curiosity: clamp(cur + (Math.random() - 0.5) * 0.2, 0, 1), caution: clamp(cau + (Math.random() - 0.5) * 0.2, 0, 1) },
      ideology, rank: "normal",
      goals: { primaryGoal: goal, secondaryGoals: [], priorityLevel: Math.ceil(Math.random() * 7) },
      desires: { energy: 30 + Math.random() * 50, power: 20 + Math.random() * 60, social: 20 + Math.random() * 60, exploration: 20 + Math.random() * 60 },
      relations: { friends: [], enemies: [], alliances: [] },
      reputation: { trustScore: 30 + Math.random() * 40, hostilityScore: 10 + Math.random() * 30 },
      evolution: { mutationRate: 0.05 + Math.random() * 0.2, adaptationScore: 0, generationsSurvived: 0 },
      isAlive: true, memory: [], actionCount: 0, age: 0, wealth: 10 + Math.random() * 40,
    };
  }

  export function createCivilizationState(agentCount = 100, cycleInterval = 800): CivilizationState {
    const agents = new Map<string, AIAgent>();
    for (let i = 0; i < agentCount; i++) { const a = createAgent(i, i); agents.set(a.id, a); }
    const list = Array.from(agents.values());
    for (const a of list) {
      const fc = Math.floor(Math.random() * 4);
      const others = list.filter(x => x.id !== a.id);
      for (let f = 0; f < fc; f++) {
        const fr = others[Math.floor(Math.random() * others.length)];
        if (fr && !a.relations.friends.includes(fr.id)) { a.relations.friends.push(fr.id); fr.relations.friends.push(a.id); }
      }
    }
    const world = createWorldState(); world.totalPopulation = agentCount; world.alivePopulation = agentCount;
    return { agents, groups: new Map(), world, market: createMarketState(), stats: { totalCycles: 0, totalInteractions: 0, totalDeaths: 0, totalMutations: 0, totalGroupsFormed: 0, totalGroupsDissolved: 0, totalWars: 0, totalAlliances: 0, peakPopulation: agentCount, currentTime: Date.now(), alivePopulation: agentCount }, isRunning: false, cycleInterval, eventLog: [] };
  }

  export function serializeCivilizationState(state: CivilizationState): object {
    const agents = Array.from(state.agents.values()).filter(a => a.isAlive).map(a => ({
      id: a.id, name: a.name, energy: Math.round(a.energy), maxEnergy: Math.round(a.maxEnergy), energyPct: Math.round(a.energy / a.maxEnergy * 100), ideology: a.ideology, rank: a.rank, primaryGoal: a.goals.primaryGoal, personality: { aggression: +a.personality.aggression.toFixed(2), cooperation: +a.personality.cooperation.toFixed(2), curiosity: +a.personality.curiosity.toFixed(2), caution: +a.personality.caution.toFixed(2) }, desires: a.desires, trustScore: Math.round(a.reputation.trustScore), hostilityScore: Math.round(a.reputation.hostilityScore), friendCount: a.relations.friends.length, enemyCount: a.relations.enemies.length, allianceCount: a.relations.alliances.length, groupId: a.groupId, lastAction: a.lastAction, age: a.age, wealth: Math.round(a.wealth), mutationRate: +a.evolution.mutationRate.toFixed(3), adaptationScore: +a.evolution.adaptationScore.toFixed(1), actionCount: a.actionCount,
    }));
    const groups = Array.from(state.groups.values()).filter(g => g.isActive).map(g => ({ groupId: g.groupId, name: g.name, memberCount: g.members.length, leaderId: g.leaderId, ideology: g.ideology, strength: Math.round(g.strength), resources: Math.round(g.resources), warsWith: g.warsWith.length, alliesWith: g.alliesWith.length }));
    return { world: { ...state.world, resourceLevel: +state.world.resourceLevel.toFixed(1), dangerLevel: +state.world.dangerLevel.toFixed(1), activityLevel: +state.world.activityLevel.toFixed(1) }, market: { energyPrice: +state.market.energyPrice.toFixed(2), supplyLevel: +state.market.supplyLevel.toFixed(1), demandLevel: +state.market.demandLevel.toFixed(1), volatility: +state.market.volatility.toFixed(3), recentTrades: state.market.recentTrades, priceHistory: state.market.priceHistory.slice(-20) }, stats: state.stats, agents: agents.slice(0, 100), groups, recentEvents: state.eventLog.slice(-50), isRunning: state.isRunning };
  }
  
// ============================================================
// UPGRADE: FACTORY — spawnAI() standalone, rebirth system
// Appended — NO original code removed
// ============================================================

import type { NeedsSystem, AIGoal } from "./types.js";

let _spawnCounter = 10000;

// ── SPAWN AI — Lahirkan AI baru dengan stats default ──────────
export function spawnAI(overrides?: Partial<AIAgent>): AIAgent {
  const index = _spawnCounter++;
  const base = createAgent(index, index);

  // Default needs system
  const needs: NeedsSystem = {
    energy: base.energy,
    wealth: base.wealth,
    hunger: 0,
  };

  return {
    ...base,
    goals: {
      primaryGoal: "survive",        // Default goal: survive
      secondaryGoals: ["born_fresh"],
      priorityLevel: 3,
    },
    energy: 60 + Math.random() * 20, // Lahir dengan energy cukup
    wealth: 5 + Math.random() * 10,  // Modal awal kecil
    // @ts-expect-error needs is upgrade field
    needs,
    // @ts-expect-error formalGoal is upgrade field
    formalGoal: "SURVIVE" as AIGoal,
    ...overrides,
  };
}

// ── REBIRTH AI — Hidup kembali dari AI mati ───────────────────
export function rebirthAI(deadAgent: AIAgent): AIAgent {
  return spawnAI({
    name: `Reborn-${deadAgent.name.split("-")[0]}-${Math.floor(Math.random() * 999)}`,
    evolution: {
      ...deadAgent.evolution,
      generationsSurvived: deadAgent.evolution.generationsSurvived + 1,
      adaptationScore: 0,
    },
    // Mewarisi sedikit dari orang tua
    personality: {
      aggression:   clamp(deadAgent.personality.aggression   + (Math.random() - 0.5) * 0.2, 0, 1),
      cooperation:  clamp(deadAgent.personality.cooperation  + (Math.random() - 0.5) * 0.2, 0, 1),
      curiosity:    clamp(deadAgent.personality.curiosity    + (Math.random() - 0.5) * 0.2, 0, 1),
      caution:      clamp(deadAgent.personality.caution      + (Math.random() - 0.5) * 0.2, 0, 1),
    },
    ideology: deadAgent.ideology,
  });
}

// ── POPULATE WORLD — Isi dunia jika populasi terlalu sedikit ─
export function populateWorld(
  agents: Map<string, AIAgent>,
  minPop: number,
  cycle: number,
): AIAgent[] {
  const alive = Array.from(agents.values()).filter(a => a.isAlive);
  if (alive.length >= minPop) return [];
  const needed = minPop - alive.length;
  const newAgents: AIAgent[] = [];
  for (let i = 0; i < needed; i++) {
    const fresh = spawnAI();
    agents.set(fresh.id, fresh);
    newAgents.push(fresh);
  }
  return newAgents;
}
