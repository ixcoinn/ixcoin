// ============================================================
  // ROUTES/CIVILIZATION-LIVE.TS — Live Civilization API
  // Semua endpoint untuk Autonomous Digital Civilization
  // ============================================================

  import { Router, type IRouter } from "express";
  import { getCivilizationState, resetCivilization } from "../ai-layer/state.js";
  import { serializeCivilizationState, createAgent } from "../ai-layer/factory.js";

  const router: IRouter = Router();

  // GET /api/ai/civilization/state — Full snapshot
  router.get("/civilization/state", (_req, res) => {
    const state = getCivilizationState();
    res.json(serializeCivilizationState(state));
  });

  // GET /api/ai/civilization/agents — All alive agents
  router.get("/civilization/agents", (_req, res) => {
    const state = getCivilizationState();
    const agents = Array.from(state.agents.values())
      .filter(a => a.isAlive)
      .sort((a, b) => b.energy - a.energy)
      .map(a => ({
        id: a.id, name: a.name, energy: Math.round(a.energy), maxEnergy: Math.round(a.maxEnergy),
        energyPct: Math.round(a.energy / a.maxEnergy * 100), ideology: a.ideology, rank: a.rank,
        primaryGoal: a.goals.primaryGoal, age: a.age, wealth: Math.round(a.wealth),
        friends: a.relations.friends.length, enemies: a.relations.enemies.length, alliances: a.relations.alliances.length,
        groupId: a.groupId, lastAction: a.lastAction, trustScore: Math.round(a.reputation.trustScore),
        hostilityScore: Math.round(a.reputation.hostilityScore), mutationRate: +a.evolution.mutationRate.toFixed(3),
        adaptationScore: +a.evolution.adaptationScore.toFixed(1),
        personality: { aggression: +a.personality.aggression.toFixed(2), cooperation: +a.personality.cooperation.toFixed(2), curiosity: +a.personality.curiosity.toFixed(2), caution: +a.personality.caution.toFixed(2) },
      }));
    res.json({ agents, total: agents.length });
  });

  // GET /api/ai/civilization/agent/:id — Single agent detail
  router.get("/civilization/agent/:id", (req, res) => {
    const state = getCivilizationState();
    const agent = state.agents.get(req.params.id);
    if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
    const group = agent.groupId ? state.groups.get(agent.groupId) : undefined;
    const friends = agent.relations.friends.map(id => state.agents.get(id)).filter(Boolean).map(a => ({ id: a!.id, name: a!.name, rank: a!.rank, isAlive: a!.isAlive }));
    const enemies = agent.relations.enemies.map(id => state.agents.get(id)).filter(Boolean).map(a => ({ id: a!.id, name: a!.name, rank: a!.rank, isAlive: a!.isAlive }));
    res.json({ agent: { ...agent, memory: agent.memory.slice(-20) }, group: group ? { groupId: group.groupId, name: group.name, memberCount: group.members.length, ideology: group.ideology } : null, friends, enemies });
  });

  // GET /api/ai/civilization/groups — All active groups/tribes
  router.get("/civilization/groups", (_req, res) => {
    const state = getCivilizationState();
    const groups = Array.from(state.groups.values()).filter(g => g.isActive).sort((a, b) => b.strength - a.strength).map(g => {
      const leader = g.leaderId ? state.agents.get(g.leaderId) : undefined;
      return { groupId: g.groupId, name: g.name, memberCount: g.members.length, leaderId: g.leaderId, leaderName: leader?.name, ideology: g.ideology, strength: Math.round(g.strength), resources: Math.round(g.resources), warsWith: g.warsWith.length, alliesWith: g.alliesWith.length };
    });
    res.json({ groups, total: groups.length });
  });

  // GET /api/ai/civilization/world — World + Market state
  router.get("/civilization/world", (_req, res) => {
    const state = getCivilizationState();
    res.json({ world: state.world, market: { energyPrice: +state.market.energyPrice.toFixed(2), supplyLevel: +state.market.supplyLevel.toFixed(1), demandLevel: +state.market.demandLevel.toFixed(1), volatility: +state.market.volatility.toFixed(3), recentTrades: state.market.recentTrades, priceHistory: state.market.priceHistory.slice(-30) } });
  });

  // GET /api/ai/civilization/stats — Simulation stats
  router.get("/civilization/stats", (_req, res) => {
    const state = getCivilizationState();
    const alive = Array.from(state.agents.values()).filter(a => a.isAlive);
    const ideologyCounts: Record<string, number> = {};
    const goalCounts: Record<string, number> = {};
    const rankCounts: Record<string, number> = {};
    for (const a of alive) {
      ideologyCounts[a.ideology] = (ideologyCounts[a.ideology] || 0) + 1;
      goalCounts[a.goals.primaryGoal] = (goalCounts[a.goals.primaryGoal] || 0) + 1;
      rankCounts[a.rank] = (rankCounts[a.rank] || 0) + 1;
    }
    const avgE = alive.reduce((s, a) => s + a.energy, 0) / (alive.length || 1);
    const avgW = alive.reduce((s, a) => s + a.wealth, 0) / (alive.length || 1);
    const avgAge = alive.reduce((s, a) => s + a.age, 0) / (alive.length || 1);
    res.json({ stats: state.stats, population: { alive: alive.length, total: state.agents.size, groups: state.groups.size, ideologyDistribution: ideologyCounts, goalDistribution: goalCounts, rankDistribution: rankCounts, avgEnergy: +avgE.toFixed(1), avgWealth: +avgW.toFixed(1), avgAge: +avgAge.toFixed(1) } });
  });

  // GET /api/ai/civilization/events — Recent events
  router.get("/civilization/events", (req, res) => {
    const state = getCivilizationState();
    const limit = Math.min(parseInt(req.query.limit as string || "50"), 200);
    const type = req.query.type as string | undefined;
    let events = state.eventLog;
    if (type) events = events.filter(e => e.type === type);
    res.json({ events: events.slice(-limit).reverse(), total: state.eventLog.length });
  });

  // POST /api/ai/civilization/control — Pause / Resume / Reset
  router.post("/civilization/control", (req, res) => {
    const { action } = req.body as { action: string };
    const state = getCivilizationState();
    switch (action) {
      case "pause": state.isRunning = false; res.json({ status: "paused", cycle: state.world.cycle }); break;
      case "resume": state.isRunning = true; res.json({ status: "running", cycle: state.world.cycle }); break;
      case "reset": { const s = resetCivilization(); res.json({ status: "reset", newAgentCount: s.agents.size }); break; }
      case "status": res.json({ isRunning: state.isRunning, cycle: state.world.cycle, alive: state.world.alivePopulation, groups: state.groups.size }); break;
      default: res.status(400).json({ error: "Use: pause, resume, reset, status" });
    }
  });

  // POST /api/ai/civilization/spawn — Spawn new agents
  router.post("/civilization/spawn", (req, res) => {
    const state = getCivilizationState();
    const count = Math.min(parseInt(req.body.count || "1"), 20);
    const spawned = [];
    for (let i = 0; i < count; i++) {
      const a = createAgent(state.agents.size + i, state.agents.size + i);
      state.agents.set(a.id, a);
      spawned.push({ id: a.id, name: a.name, ideology: a.ideology });
    }
    res.json({ spawned, totalAlive: Array.from(state.agents.values()).filter(a => a.isAlive).length });
  });

  export default router;
  