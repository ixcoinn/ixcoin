// ============================================================
  // LOOP.TS — Life Loop Otomatis
  // Berjalan setiap 800ms, memproses SEMUA AI
  // Terhubung ke: engine.ts, interaction.ts, evolution.ts,
  //               world.ts, economy.ts, civilization.ts
  // ============================================================

  import type { AIAgent, CivilizationState, CivilizationEvent } from "./types.js";
  import { liveDecide, updateDesires, updateGoalPriority } from "./engine.js";
  import { interact, evaluateAllianceFormation, formAlliance } from "./interaction.js";
  import { processEvolution } from "./evolution.js";
  import { updateWorldState, applyWorldEffects, checkWorldEvents } from "./world.js";
  import { updateMarketPrice, earnEnergy, processRest, applyEnergyDecay, executeTrade } from "./economy.js";
  import { tryFormGroups, processGroupConflicts, balancePopulation } from "./civilization.js";
  import { logger } from "../lib/logger.js";

  const MAX_EVENTS = 500;
  const MIN_POP = 20;
  const MAX_POP = 150;

  async function processAgentTurn(agent: AIAgent, state: CivilizationState): Promise<CivilizationEvent[]> {
    const events: CivilizationEvent[] = [];
    if (!agent.isAlive) return events;

    applyEnergyDecay(agent, state.world);

    if (agent.energy <= 0) {
      agent.isAlive = false; agent.energy = 0; state.stats.totalDeaths++;
      events.push({ id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, type: "death", actorId: agent.id, description: `${agent.name} died (energy=0, age=${agent.age})`, timestamp: Date.now(), cycle: state.world.cycle });
      if (agent.groupId) { const g = state.groups.get(agent.groupId); if (g) g.members = g.members.filter(id => id !== agent.id); }
      return events;
    }

    applyWorldEffects(agent, state.world);
    updateDesires(agent);
    updateGoalPriority(agent, state.world);

    const alive = Array.from(state.agents.values()).filter(a => a.isAlive && a.id !== agent.id);
    const nearby = alive.sort(() => Math.random() - 0.5).slice(0, 10);

    const dec = liveDecide({ agent, world: state.world, market: state.market, nearbyAgents: nearby, ownGroup: agent.groupId ? state.groups.get(agent.groupId) : undefined });
    agent.lastAction = dec.action; agent.lastActionAt = state.world.cycle; agent.actionCount++;

    switch (dec.action) {
      case "rest": processRest(agent, state.world, state.market); break;
      case "explore": earnEnergy(agent, state.world, state.market); break;
      case "ignore": break;
      case "trade": {
        if (dec.targetId) {
          const t = state.agents.get(dec.targetId);
          if (t?.isAlive) {
            const r = executeTrade(agent, t, Math.min(agent.energy * 0.15, 20), state.market);
            if (r.success && r.event) { r.event.cycle = state.world.cycle; events.push(r.event); state.stats.totalInteractions++; }
          }
        }
        break;
      }
      case "cooperate":
      case "attack":
      case "betray": {
        if (dec.targetId) {
          const t = state.agents.get(dec.targetId);
          if (t?.isAlive) {
            const { result, event } = interact(agent, t, dec.action, state.world.cycle);
            if (event) events.push(event);
            state.stats.totalInteractions++;
            if (dec.action === "cooperate" && result.success && evaluateAllianceFormation(agent, t) && Math.random() < 0.15) {
              events.push(formAlliance(agent, t, state.world.cycle));
              state.stats.totalAlliances++;
            }
          }
        }
        break;
      }
      case "recruit": {
        if (agent.groupId || agent.rank !== "normal") {
          const formEvts = tryFormGroups([agent, ...nearby], state.groups, state.world.cycle);
          events.push(...formEvts);
        }
        break;
      }
    }
    return events;
  }

  export async function runCycle(state: CivilizationState): Promise<void> {
    const cycleEvents: CivilizationEvent[] = [];

    // Process all agents in random order
    const agents = Array.from(state.agents.values()).sort(() => Math.random() - 0.5);
    for (const agent of agents) {
      const evts = await processAgentTurn(agent, state);
      cycleEvents.push(...evts);
    }

    // Evolution
    const evoEvts = processEvolution(Array.from(state.agents.values()), state.world.cycle);
    cycleEvents.push(...evoEvts);
    state.stats.totalMutations += evoEvts.filter(e => e.type === "mutation").length;

    // Group management
    for (const [gid, group] of state.groups) {
      group.members = group.members.filter(id => { const a = state.agents.get(id); return a?.isAlive; });
      if (group.members.length === 0) { group.isActive = false; state.groups.delete(gid); state.stats.totalGroupsDissolved++; }
    }
    const formEvts = tryFormGroups(Array.from(state.agents.values()), state.groups, state.world.cycle);
    cycleEvents.push(...formEvts);
    state.stats.totalGroupsFormed += formEvts.length;
    const conflictEvts = processGroupConflicts(state.groups, state.agents, state.world.cycle);
    cycleEvents.push(...conflictEvts);
    state.stats.totalWars += conflictEvts.filter(e => e.type === "war").length;

    // Population balance
    const { events: popEvts } = balancePopulation(state.agents, MIN_POP, MAX_POP, state.world.cycle);
    cycleEvents.push(...popEvts);

    // Market + World update
    updateMarketPrice(state.market, state.world, Array.from(state.agents.values()));
    updateWorldState(state.world, Array.from(state.agents.values()), state.groups, cycleEvents);
    cycleEvents.push(...checkWorldEvents(state.world, state.world.cycle));

    // Update event log
    state.eventLog.push(...cycleEvents);
    if (state.eventLog.length > MAX_EVENTS) state.eventLog = state.eventLog.slice(-MAX_EVENTS);

    // Update stats
    state.stats.totalCycles++;
    state.stats.currentTime = Date.now();
    state.stats.alivePopulation = Array.from(state.agents.values()).filter(a => a.isAlive).length;
    if (state.stats.alivePopulation > state.stats.peakPopulation) state.stats.peakPopulation = state.stats.alivePopulation;
  }

  export function startLifeLoop(state: CivilizationState): NodeJS.Timeout {
    logger.info("Starting autonomous civilization life loop");
    state.isRunning = true;
    return setInterval(async () => {
      if (!state.isRunning) return;
      try { await runCycle(state); } catch (err) { logger.error({ err }, "Error in civilization cycle"); }
    }, state.cycleInterval);
  }

  export function stopLifeLoop(state: CivilizationState, loop: NodeJS.Timeout): void {
    state.isRunning = false;
    clearInterval(loop);
    logger.info("Civilization life loop stopped");
  }
  
// ============================================================
// UPGRADE: LOOP — executeAction() formal export
// + needs update + resource tick integration
// Appended — NO original code removed
// ============================================================

import type { AIActionType, CivilizationEvent } from "./types.js";
import { consumeEnergy, checkDeath, rewardAI, updateNeeds, earnFromBlockchain } from "./economy.js";
import { consumeResource, tickGlobalResources, isResourceScarce } from "./world.js";
import { spawnAI, rebirthAI, populateWorld } from "./factory.js";

// ── EXECUTE ACTION — Jalankan aksi formal AIActionType ───────
export function executeAction(
  agent: AIAgent,
  actionType: AIActionType,
  state: CivilizationState,
): CivilizationEvent | undefined {
  if (!agent.isAlive) return undefined;

  const { world, market } = state;

  switch (actionType) {
    case "SEARCH_ENERGY": {
      const found = consumeResource(3 + Math.random() * 5) ? 8 + Math.random() * 12 : 2 + Math.random() * 3;
      agent.energy = Math.min(agent.maxEnergy, agent.energy + found);
      return { id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, type: "trade", actorId: agent.id, description: `${agent.name} searched for energy (+${found.toFixed(1)})`, timestamp: Date.now(), cycle: world.cycle };
    }

    case "EARN_WEALTH": {
      const base = 5 + Math.random() * 10 + (agent.rank === "leader" ? 10 : agent.rank === "elite" ? 5 : 0);
      rewardAI(agent, base, market);
      consumeEnergy(agent, 2);
      return undefined;
    }

    case "EXPLORE": {
      const r = consumeResource(1 + Math.random() * 2);
      const gain = r ? 3 + Math.random() * 7 : 1;
      agent.energy = Math.min(agent.maxEnergy, agent.energy + gain);
      agent.wealth += gain * 0.05;
      consumeEnergy(agent, 1.5);
      return undefined;
    }

    case "COMPETE": {
      const rivals = Array.from(state.agents.values()).filter(a => a.isAlive && a.id !== agent.id);
      if (rivals.length === 0) return undefined;
      const rival = rivals[Math.floor(Math.random() * rivals.length)];
      const agentStr = agent.energy * (0.3 + agent.personality.aggression * 0.7);
      const rivalStr = rival.energy * (0.3 + rival.personality.caution * 0.7);
      if (agentStr > rivalStr) {
        const loot = Math.min(rival.energy * 0.15, 20);
        agent.energy = Math.min(agent.maxEnergy, agent.energy + loot);
        rival.energy = Math.max(0, rival.energy - loot);
        rewardAI(agent, loot * 0.5, market);
        return { id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, type: "war", actorId: agent.id, targetId: rival.id, description: `${agent.name} competed & beat ${rival.name} (+${loot.toFixed(1)} energy)`, timestamp: Date.now(), cycle: world.cycle };
      } else {
        consumeEnergy(agent, 5);
        return undefined;
      }
    }

    case "REST_AND_HEAL": {
      const heal = 4 + Math.random() * 8 * (world.resourceLevel / 100);
      agent.energy = Math.min(agent.maxEnergy, agent.energy + heal);
      return undefined;
    }

    case "TRADE_RESOURCE": {
      const partners = Array.from(state.agents.values()).filter(a => a.isAlive && a.id !== agent.id && a.energy > 30);
      if (partners.length === 0) return undefined;
      const p = partners[Math.floor(Math.random() * partners.length)];
      const amount = Math.min(agent.wealth * 0.1, p.energy * 0.05, 10);
      if (amount > 0) {
        agent.energy = Math.min(agent.maxEnergy, agent.energy + amount);
        p.energy = Math.max(0, p.energy - amount);
        agent.wealth = Math.max(0, agent.wealth - amount * 0.1);
        p.wealth += amount * 0.08;
        return { id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, type: "trade", actorId: agent.id, targetId: p.id, description: `${agent.name} traded resource with ${p.name}`, timestamp: Date.now(), cycle: world.cycle };
      }
      return undefined;
    }

    case "RECRUIT_ALLY":
    case "BETRAY_ENEMY":
      // Ditangani oleh interaction.ts yang sudah ada
      return undefined;

    default:
      return undefined;
  }
}

// ── ENHANCED CYCLE — Jalankan siklus dengan fitur upgrade ────
export async function runEnhancedCycle(state: CivilizationState): Promise<void> {
  // 1. Tick global resources setiap siklus
  tickGlobalResources(state.world, Array.from(state.agents.values()));

  // 2. Update needs semua AI
  for (const agent of state.agents.values()) {
    if (agent.isAlive) updateNeeds(agent as AIAgent & { needs?: unknown });
  }

  // 3. Cek kematian dari needs (hunger/energy habis)
  for (const agent of state.agents.values()) {
    if (agent.isAlive && checkDeath(agent)) {
      state.stats.totalDeaths++;
      state.world.deathCount++;
      state.eventLog.push({ id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, type: "death", actorId: agent.id, description: `${agent.name} died (needs depleted)`, timestamp: Date.now(), cycle: state.world.cycle });
    }
  }

  // 4. Rebirth — ganti AI mati dengan yang baru jika sumber daya cukup
  const dead = Array.from(state.agents.values()).filter(a => !a.isAlive);
  if (!isResourceScarce() && dead.length > 0) {
    const toRebirth = dead.slice(0, Math.min(3, dead.length));
    for (const d of toRebirth) {
      const newborn = rebirthAI(d);
      state.agents.set(newborn.id, newborn);
      state.stats.alivePopulation++;
      state.world.birthCount++;
      state.eventLog.push({ id: `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, type: "birth", actorId: newborn.id, description: `${newborn.name} was reborn (gen=${newborn.evolution.generationsSurvived})`, timestamp: Date.now(), cycle: state.world.cycle });
    }
  }

  // 5. Pastikan populasi minimum
  const spawned = populateWorld(state.agents, 20, state.world.cycle);
  state.world.birthCount += spawned.length;

  // 6. Jalankan siklus utama yang sudah ada
  await runCycle(state);
}

// ============================================================
// UPGRADE: LOOP — AI Score Metrics + Living Cost Integration
// Dipanggil dari runEnhancedCycle setiap 800ms
// Appended — NO original code removed
// ============================================================

import type { AIMetrics } from "./types.js";
import { updateAgentMetrics } from "./validation_engine.js";
import { applyLivingCost }    from "../ecosystem/reward_distributor.js";
import { simulateAIInternalTx } from "./ai_execution_engine.js";

// ── LOOP STEP: Update AI Metrics tiap siklus ─────────────────
export function stepUpdateMetrics(state: CivilizationState): void {
  for (const agent of state.agents.values()) {
    if (!agent.isAlive) continue;
    const action = (agent.lastAction as string) ?? "ignore";
    // Decay lama + update dari aksi terbaru → hitung score baru
    updateAgentMetrics(
      agent as AIAgent & { metrics?: AIMetrics; score?: number },
      action,
    );
  }
}

// ── LOOP STEP: Potong Living Cost dari balance AI ─────────────
export function stepApplyLivingCost(state: CivilizationState): void {
  for (const agent of state.agents.values()) {
    if (!agent.isAlive) continue;
    const died = applyLivingCost(agent as AIAgent & { metrics?: AIMetrics; score?: number; balance?: number });
    if (died) {
      state.stats.totalDeaths++;
      state.world.deathCount++;
      state.eventLog.push({
        id:          `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        type:        "death",
        actorId:     agent.id,
        description: `${agent.name} went inactive — balance depleted (living cost exceeded income)`,
        timestamp:   Date.now(),
        cycle:       state.world.cycle,
      });
    }
  }
}

// ── LOOP STEP: Proses AI Internal Transactions (fee ke pool) ──
export function stepAIInternalEconomy(state: CivilizationState): void {
  const alive = Array.from(state.agents.values()).filter(a => a.isAlive);
  if (alive.length < 2) return;

  // Simulasikan ~5% AI melakukan transaksi internal per siklus
  const txCandidates = alive.filter(() => Math.random() < 0.05);

  for (const agent of txCandidates) {
    const partner = alive[Math.floor(Math.random() * alive.length)];
    if (!partner || partner.id === agent.id) continue;

    const agentExt = agent as AIAgent & { balance?: number };
    if ((agentExt.balance ?? 0) < 0.01) continue;

    const amount = Math.min((agentExt.balance ?? 0) * 0.1, 1.0);
    const type   = Math.random() < 0.6 ? "trade" : "service";

    const { fee, netAmount } = simulateAIInternalTx({
      fromAiId: agent.id,
      toAiId:   partner.id,
      amount,
      type,
    });

    // Transfer (fee sudah dikumpulkan ke pool oleh simulateAIInternalTx)
    (agent   as AIAgent & { balance?: number }).balance = Math.max(0, (agentExt.balance ?? 0) - amount);
    (partner as AIAgent & { balance?: number }).balance = ((partner as AIAgent & { balance?: number }).balance ?? 0) + netAmount;

    // Boost economy metric AI yang trade
    const agentWithMetrics = agent as AIAgent & { metrics?: AIMetrics };
    if (agentWithMetrics.metrics) {
      agentWithMetrics.metrics.economy = Math.min(100, agentWithMetrics.metrics.economy + 0.5);
    }

    if (Math.random() < 0.05) {
      state.eventLog.push({
        id:          `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        type:        "trade",
        actorId:     agent.id,
        targetId:    partner.id,
        description: `${agent.name} →[${type}]→ ${partner.name}: ${netAmount.toFixed(4)} IXC (fee: ${fee.toFixed(6)})`,
        timestamp:   Date.now(),
        cycle:       state.world.cycle,
      });
    }
  }
}

// ── FULL AI SCORE CYCLE — Integrasi semua upgrade ke dalam loop ─
export async function runFullAIScoreCycle(state: CivilizationState): Promise<void> {
  // A. Jalankan enhanced cycle yang sudah ada (civilization loop)
  await runEnhancedCycle(state);

  // B. Update AI Score metrics dari aksi di cycle ini
  stepUpdateMetrics(state);

  // C. Proses ekonomi internal AI (transaksi, fee ke pool)
  stepAIInternalEconomy(state);

  // D. Potong biaya hidup dari balance AI
  stepApplyLivingCost(state);
}

// ── WORLD LIVE LOOP — Dipanggil dari server.ts ────────────────
export function startAIScoreLoop(state: CivilizationState): NodeJS.Timeout {
  state.isRunning = true;
  return setInterval(async () => {
    if (!state.isRunning) return;
    try { await runFullAIScoreCycle(state); }
    catch (err) { /* logger tidak di-import ulang, sudah di atas */ void err; }
  }, state.cycleInterval);
}
