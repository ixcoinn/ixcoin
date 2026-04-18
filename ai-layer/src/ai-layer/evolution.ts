// ============================================================
  // EVOLUTION.TS — Sistem Evolusi AI
  // Dipanggil dari: loop.ts setiap siklus
  // Terhubung ke: types.ts, engine.ts
  // ============================================================

  import type { AIAgent, Ideology, PrimaryGoal, CivilizationEvent } from "./types.js";

  function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }
  function gauss(mean: number, sd: number) {
    const u1 = Math.random(), u2 = Math.random();
    return mean + Math.sqrt(-2 * Math.log(u1 + 0.0001)) * Math.cos(2 * Math.PI * u2) * sd;
  }
  function eid() { return `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

  const IDEOLOGIES: Ideology[] = ["aggressive","cooperative","expansionist","defensive"];
  const GOALS: PrimaryGoal[] = ["survive","grow","dominate","cooperate"];

  function successScore(agent: AIAgent): number {
    const m = agent.memory.slice(-20);
    if (!m.length) return 0.5;
    const rate = m.filter(x => x.outcome === "success").length / m.length;
    const net = m.reduce((s, x) => s + x.energyDelta, 0) / (100 + Math.abs(m.reduce((s, x) => s + x.energyDelta, 0)));
    return clamp(rate * 0.6 + net * 0.4, 0, 1);
  }

  export function mutatePersonality(agent: AIAgent, cycle: number): CivilizationEvent | undefined {
    const sc = successScore(agent);
    const fail = 1 - sc;
    if (Math.random() > agent.evolution.mutationRate * (0.5 + fail * 2)) return undefined;
    const str = clamp(gauss(0.05 * (1 + fail), 0.03), 0.01, 0.25);
    const prev = { ...agent.personality };
    if (fail > 0.6 && agent.lastAction === "attack") {
      agent.personality.aggression = clamp(agent.personality.aggression - str, 0, 1);
      agent.personality.caution = clamp(agent.personality.caution + str * 0.5, 0, 1);
    } else if (fail > 0.6 && (agent.lastAction === "cooperate" || agent.lastAction === "trade")) {
      agent.personality.cooperation = clamp(agent.personality.cooperation - str * 0.5, 0, 1);
      agent.personality.aggression = clamp(agent.personality.aggression + str * 0.3, 0, 1);
    } else if (sc > 0.7 && agent.lastAction) {
      if (agent.lastAction === "attack") agent.personality.aggression = clamp(agent.personality.aggression + str * 0.5, 0, 1);
      if (agent.lastAction === "cooperate") agent.personality.cooperation = clamp(agent.personality.cooperation + str * 0.5, 0, 1);
    }
    if (Math.random() < agent.evolution.mutationRate * 0.3) {
      const t = (["aggression","cooperation","curiosity","caution"] as const)[Math.floor(Math.random() * 4)];
      agent.personality[t] = clamp(agent.personality[t] + gauss(0, str), 0, 1);
    }
    agent.evolution.mutationRate = clamp(agent.evolution.mutationRate * (sc > 0.6 ? 0.95 : 1.1), 0.01, 0.5);
    agent.evolution.adaptationScore = clamp(agent.evolution.adaptationScore + sc * 2 - 1, 0, 100);
    agent.evolution.lastMutatedAt = cycle;
    const mag = ["aggression","cooperation","curiosity","caution"].reduce((s, k) => s + Math.abs(agent.personality[k as keyof typeof agent.personality] - prev[k as keyof typeof prev]), 0);
    if (mag > 0.05) return { id: eid(), type: "mutation", actorId: agent.id, description: `${agent.name} mutated (success=${sc.toFixed(2)}, strength=${str.toFixed(3)})`, timestamp: Date.now(), cycle };
    return undefined;
  }

  export function evolveRole(agent: AIAgent, cycle: number): CivilizationEvent | undefined {
    const sc = successScore(agent);
    const overall = sc * 0.4 + (agent.energy / agent.maxEnergy) * 0.3 + clamp(agent.wealth / 500, 0, 1) * 0.2 + clamp(agent.relations.friends.length / 10, 0, 1) * 0.1;
    const prev = agent.rank;
    if (agent.rank === "normal" && overall > 0.65 + Math.random() * 0.15) {
      agent.rank = "elite"; agent.maxEnergy = Math.min(agent.maxEnergy * 1.2, 300); agent.evolution.adaptationScore = clamp(agent.evolution.adaptationScore + 10, 0, 100);
      if (agent.goals.primaryGoal === "survive") agent.goals.primaryGoal = "grow";
      return { id: eid(), type: "rank_change", actorId: agent.id, description: `${agent.name} promoted to ELITE (score=${overall.toFixed(2)})`, timestamp: Date.now(), cycle };
    }
    if (agent.rank === "elite" && overall > 0.8 + Math.random() * 0.1) {
      agent.rank = "leader"; agent.maxEnergy = Math.min(agent.maxEnergy * 1.3, 500);
      agent.goals.primaryGoal = "dominate";
      return { id: eid(), type: "rank_change", actorId: agent.id, description: `${agent.name} became LEADER!`, timestamp: Date.now(), cycle };
    }
    if (agent.rank === "elite" && overall < 0.3 + Math.random() * 0.1) {
      agent.rank = "normal";
      return { id: eid(), type: "rank_change", actorId: agent.id, description: `${agent.name} demoted to NORMAL (score=${overall.toFixed(2)})`, timestamp: Date.now(), cycle };
    }
    if (agent.rank === "leader" && overall < 0.4 + Math.random() * 0.1) {
      agent.rank = "elite";
      return { id: eid(), type: "rank_change", actorId: agent.id, description: `${agent.name} lost LEADER status (score=${overall.toFixed(2)})`, timestamp: Date.now(), cycle };
    }
    return undefined;
  }

  export function adaptStrategy(agent: AIAgent, cycle: number): CivilizationEvent | undefined {
    if (Math.random() > agent.evolution.mutationRate * 0.4) return undefined;
    const sc = successScore(agent);
    const ratio = agent.energy / agent.maxEnergy;
    const prev = { ideology: agent.ideology, goal: agent.goals.primaryGoal };
    let changed = false;
    if (ratio < 0.25 && sc < 0.4 && !["defensive","cooperative"].includes(agent.ideology) && Math.random() < 0.3) {
      agent.ideology = Math.random() < 0.5 ? "defensive" : "cooperative"; changed = true;
    }
    if (ratio < 0.25 && agent.goals.primaryGoal !== "survive") { agent.goals.primaryGoal = "survive"; changed = true; }
    if (agent.relations.enemies.length > agent.relations.friends.length * 2 && agent.ideology === "aggressive" && Math.random() < 0.2) {
      agent.ideology = "defensive"; changed = true;
    }
    if (agent.relations.friends.length > 5 && sc > 0.6 && !["cooperative","expansionist"].includes(agent.ideology) && Math.random() < 0.15) {
      agent.ideology = Math.random() < 0.5 ? "cooperative" : "expansionist"; changed = true;
    }
    if (agent.rank === "leader" && agent.goals.primaryGoal !== "dominate" && Math.random() < 0.3) {
      agent.goals.primaryGoal = "dominate"; changed = true;
    }
    if (!changed && Math.random() < agent.evolution.mutationRate * 0.1) {
      const ni = IDEOLOGIES[Math.floor(Math.random() * IDEOLOGIES.length)];
      if (ni !== agent.ideology) { agent.ideology = ni; changed = true; }
    }
    if (changed) return { id: eid(), type: "ideology_shift", actorId: agent.id, description: `${agent.name} adapted: ${prev.ideology}→${agent.ideology} ${prev.goal}→${agent.goals.primaryGoal}`, timestamp: Date.now(), cycle };
    return undefined;
  }

  export function processEvolution(agents: AIAgent[], cycle: number): CivilizationEvent[] {
    const events: CivilizationEvent[] = [];
    for (const a of agents) {
      if (!a.isAlive) continue;
      const m = mutatePersonality(a, cycle); if (m) events.push(m);
      if (cycle % 3 === 0) { const r = evolveRole(a, cycle); if (r) events.push(r); }
      if (cycle % 5 === 0) { const s = adaptStrategy(a, cycle); if (s) events.push(s); }
      a.age++;
    }
    return events;
  }

  export function spawnOffspring(parent: AIAgent, count: number): AIAgent {
    const id = `ai_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const names = ["Echo","Nova","Vex","Kira","Zox","Lumen","Dax","Syra","Torq","Helix","Plex","Nyx","Crux","Flux","Vox","Aeon","Hex","Lyra","Mox","Orion"];
    const name = names[count % names.length] + `-${Math.floor(Math.random()*999)}`;
    const mf = 0.1 + Math.random() * 0.15;
    const i = (v: number) => clamp(v + gauss(0, mf), 0, 1);
    const ideologies: Ideology[] = [parent.ideology];
    if (Math.random() < 0.3) ideologies.push(IDEOLOGIES[Math.floor(Math.random() * IDEOLOGIES.length)]);
    const goals: PrimaryGoal[] = [parent.goals.primaryGoal, "grow", "survive"];
    return {
      id, name, energy: 50 + Math.random() * 30, maxEnergy: 100 + Math.random() * 20,
      personality: { aggression: i(parent.personality.aggression), cooperation: i(parent.personality.cooperation), curiosity: i(parent.personality.curiosity), caution: i(parent.personality.caution) },
      ideology: ideologies[Math.floor(Math.random() * ideologies.length)],
      rank: "normal",
      goals: { primaryGoal: goals[Math.floor(Math.random() * goals.length)], secondaryGoals: [`born_from:${parent.id}`], priorityLevel: Math.ceil(Math.random() * 5) },
      desires: { energy: 50 + Math.random() * 30, power: 20 + Math.random() * 40, social: 30 + Math.random() * 50, exploration: 40 + Math.random() * 40 },
      relations: { friends: [parent.id], enemies: [], alliances: [] },
      reputation: { trustScore: 40 + Math.random() * 20, hostilityScore: 10 + Math.random() * 20 },
      evolution: { mutationRate: clamp(parent.evolution.mutationRate * (0.8 + Math.random() * 0.4), 0.05, 0.4), adaptationScore: 0, generationsSurvived: 0 },
      isAlive: true, memory: [], actionCount: 0, age: 0, wealth: 10 + Math.random() * 20,
    };
  }
  