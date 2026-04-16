// ============================================================
  // WORLD.TS — Sistem Dunia Global
  // Terhubung ke: types.ts, loop.ts, economy.ts
  // Mempengaruhi semua AI secara global
  // ============================================================

  import type { AIAgent, WorldState, CivilizationEvent, Group } from "./types.js";

  function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }
  function eid() { return `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

  export function createWorldState(): WorldState {
    return { cycle: 0, totalPopulation: 0, alivePopulation: 0, resourceLevel: 60 + Math.random() * 20, dangerLevel: 20 + Math.random() * 15, activityLevel: 40 + Math.random() * 20, conflictCount: 0, allianceCount: 0, deathCount: 0, birthCount: 0, tradeVolume: 0, lastUpdatedAt: Date.now() };
  }

  export function updateWorldState(world: WorldState, agents: AIAgent[], groups: Map<string, Group>, events: CivilizationEvent[]): void {
    const alive = agents.filter(a => a.isAlive);
    world.totalPopulation = agents.length;
    world.alivePopulation = alive.length;
    world.cycle++;
    world.lastUpdatedAt = Date.now();

    const deaths = events.filter(e => e.type === "death").length;
    const attacks = events.filter(e => e.type === "war").length;
    const alliances = events.filter(e => e.type === "alliance").length;
    const trades = events.filter(e => e.type === "trade").length;
    world.deathCount += deaths; world.conflictCount += attacks; world.allianceCount += alliances; world.tradeVolume += trades;

    const pop = clamp(world.alivePopulation / 100, 0, 3);
    world.resourceLevel = clamp(world.resourceLevel + 2 + Math.random() * 3 - pop * 3 - attacks * 0.5 + trades * 0.3 + (Math.random() - 0.5) * 5, 5, 100);
    world.dangerLevel = clamp(world.dangerLevel + attacks * 2 + (pop > 1.5 ? (pop - 1.5) * 3 : 0) + (world.resourceLevel < 25 ? (25 - world.resourceLevel) * 0.5 : 0) - 1.5 + (Math.random() - 0.3) * 4, 0, 100);
    const actTarget = (attacks + alliances + trades) * 3 + world.alivePopulation * 0.2;
    world.activityLevel = clamp(world.activityLevel * 0.7 + actTarget * 0.3 + (Math.random() - 0.5) * 10, 0, 100);

    const icount: Record<string, number> = {};
    for (const a of alive) icount[a.ideology] = (icount[a.ideology] || 0) + 1;
    let max = 0, dom: string | undefined;
    for (const [k, v] of Object.entries(icount)) if (v > max) { max = v; dom = k; }
    world.dominantIdeology = max > world.alivePopulation * 0.4 ? dom as typeof world.dominantIdeology : undefined;
  }

  export function applyWorldEffects(agent: AIAgent, world: WorldState): void {
    const low = world.resourceLevel < 25 ? (25 - world.resourceLevel) * 0.1 : 0;
    const high = world.resourceLevel > 70 ? (world.resourceLevel - 70) * 0.05 : 0;
    const danger = world.dangerLevel > 60 ? (world.dangerLevel - 60) * 0.08 : 0;
    const rank = agent.rank === "leader" ? 1.3 : agent.rank === "elite" ? 1.1 : 1.0;
    agent.energy = Math.max(0, agent.energy + (high - low - danger + (Math.random() - 0.3) * 2) * rank);
    if (world.dangerLevel > 70) {
      if (agent.ideology === "defensive") agent.desires.energy = Math.min(100, agent.desires.energy + 5);
      else if (agent.ideology === "aggressive") agent.desires.power = Math.min(100, agent.desires.power + 3);
    }
    if (world.resourceLevel < 25 && agent.desires.energy < 70) agent.desires.energy = Math.min(100, agent.desires.energy + 10);
    if (world.activityLevel > 70) { agent.desires.social = Math.min(100, agent.desires.social + 3); agent.desires.exploration = Math.min(100, agent.desires.exploration + 2); }
  }

  export function checkWorldEvents(world: WorldState, cycle: number): CivilizationEvent[] {
    const events: CivilizationEvent[] = [];
    if (world.resourceLevel < 15 && Math.random() < 0.3) events.push({ id: eid(), type: "war", description: "WORLD EVENT: Severe resource shortage!", timestamp: Date.now(), cycle });
    if (world.dangerLevel > 85 && Math.random() < 0.2) {
      const s = Math.random() * 15; world.dangerLevel = Math.max(50, world.dangerLevel - s);
      events.push({ id: eid(), type: "alliance", description: `WORLD EVENT: Crisis forces ceasefire (danger -${s.toFixed(1)})`, timestamp: Date.now(), cycle });
    }
    if (world.resourceLevel < 30 && world.alivePopulation > 10 && Math.random() < 0.15) {
      const bloom = 10 + Math.random() * 20; world.resourceLevel = Math.min(100, world.resourceLevel + bloom);
      events.push({ id: eid(), type: "trade", description: `WORLD EVENT: Resource bloom! +${bloom.toFixed(1)} found`, timestamp: Date.now(), cycle });
    }
    return events;
  }
  
// ============================================================
// UPGRADE: WORLD — Global Resource Pool + consumeResource
// Appended — NO original code removed
// ============================================================

import type { GlobalResourcePool } from "./types.js";

// ── GLOBAL RESOURCE POOL — Singleton resource terbatas ───────
let _globalResources: GlobalResourcePool = {
  total:         10000,
  available:     10000,
  consumed:      0,
  replenishRate: 15,   // ditambah per siklus
  lastUpdated:   Date.now(),
};

export function getGlobalResources(): GlobalResourcePool {
  return _globalResources;
}

export function initGlobalResources(total = 10000, replenishRate = 15): void {
  _globalResources = { total, available: total, consumed: 0, replenishRate, lastUpdated: Date.now() };
}

// ── CONSUME RESOURCE — AI ambil resource dari dunia ──────────
export function consumeResource(amount: number): boolean {
  if (_globalResources.available < amount) return false;
  _globalResources.available -= amount;
  _globalResources.consumed  += amount;
  _globalResources.lastUpdated = Date.now();
  return true;
}

// ── REPLENISH — Resource bertumbuh kembali setiap siklus ─────
export function replenishResources(): void {
  const gained = _globalResources.replenishRate + Math.random() * 5;
  _globalResources.available = Math.min(_globalResources.total, _globalResources.available + gained);
  _globalResources.lastUpdated = Date.now();
}

// ── COMPETITION TRIGGER — Cek apakah AI harus bersaing ───────
export function isResourceScarce(): boolean {
  return _globalResources.available < _globalResources.total * 0.2;
}

// ── SYNC WORLD STATE — Sinkronisasi resource ke world state ──
export function syncResourceToWorld(world: WorldState): void {
  const pct = (_globalResources.available / _globalResources.total) * 100;
  world.resourceLevel = clamp(pct, 5, 100);
}

// ── TICK RESOURCE — Dipanggil setiap loop siklus ─────────────
export function tickGlobalResources(world: WorldState, agents: AIAgent[]): void {
  replenishResources();
  syncResourceToWorld(world);
  // AI hidup mengkonsumsi resource secara pasif
  const alive = agents.filter(a => a.isAlive);
  const passiveConsume = alive.length * 0.05;
  consumeResource(passiveConsume);
}
