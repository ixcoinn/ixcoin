// ============================================================
  // ECONOMY.TS — Sistem Ekonomi Dinamis
  // Terhubung ke: types.ts, loop.ts, world.ts
  // Supply & Demand real-time, reward dinamis
  // ============================================================

  import type { AIAgent, MarketState, WorldState, CivilizationEvent } from "./types.js";

  function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }
  function eid() { return `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

  export function createMarketState(): MarketState {
    return { energyPrice: 1.0, supplyLevel: 60, demandLevel: 50, recentTrades: 0, priceHistory: [1.0], volatility: 0.1 };
  }

  export function updateMarketPrice(market: MarketState, world: WorldState, agents: AIAgent[]): void {
    const alive = agents.filter(a => a.isAlive);
    const avgE = alive.reduce((s, a) => s + a.energy, 0) / (alive.length || 1);
    market.supplyLevel = clamp(world.resourceLevel * 0.6 + (avgE / 100) * 40 + (Math.random() - 0.5) * 10, 5, 100);
    const avgDE = alive.reduce((s, a) => s + a.desires.energy, 0) / (alive.length || 1);
    market.demandLevel = clamp(avgDE * 0.7 + (100 - world.resourceLevel) * 0.3 + world.dangerLevel * 0.2 + (Math.random() - 0.5) * 10, 5, 100);
    const target = 1 / (market.supplyLevel / (market.demandLevel + 1) * 0.8 + 0.2);
    market.energyPrice = clamp(market.energyPrice * 0.7 + target * 0.3 + (Math.random() - 0.5) * market.volatility * 0.5, 0.1, 10);
    market.priceHistory.push(market.energyPrice);
    if (market.priceHistory.length > 50) market.priceHistory = market.priceHistory.slice(-50);
    if (market.priceHistory.length > 5) {
      const r = market.priceHistory.slice(-5);
      const m = r.reduce((s, p) => s + p, 0) / r.length;
      market.volatility = clamp(Math.sqrt(r.reduce((s, p) => s + Math.pow(p - m, 2), 0) / r.length) * 0.5 + market.volatility * 0.5, 0.01, 1);
    }
    market.recentTrades = 0;
  }

  export function calculateActionReward(agent: AIAgent, action: string, base: number, world: WorldState, market: MarketState): number {
    let r = base * market.energyPrice;
    if (world.resourceLevel < 30) r *= 1.3; else if (world.resourceLevel > 70) r *= 0.85;
    if (action === "trade" || action === "cooperate") r *= 1 + market.supplyLevel / 200;
    if (action === "attack") r *= 1 + world.dangerLevel / 100;
    r *= (agent.rank === "leader" ? 1.4 : agent.rank === "elite" ? 1.2 : 1.0);
    return Math.max(0, r * (0.8 + Math.random() * 0.4));
  }

  export function earnEnergy(agent: AIAgent, world: WorldState, market: MarketState): number {
    const actual = calculateActionReward(agent, "explore", 2 + Math.random() * 5, world, market);
    agent.energy = clamp(agent.energy + actual, 0, agent.maxEnergy);
    agent.wealth += actual * 0.1;
    return actual;
  }

  export function executeTrade(buyer: AIAgent, seller: AIAgent, amount: number, market: MarketState): { success: boolean; price: number; event?: CivilizationEvent } {
    const price = amount * market.energyPrice;
    if (seller.energy < amount) return { success: false, price };
    const wCost = price * 0.1;
    if (buyer.wealth < wCost && Math.random() > 0.3) return { success: false, price };
    seller.energy = clamp(seller.energy - amount, 0, seller.maxEnergy);
    buyer.energy = clamp(buyer.energy + amount, 0, buyer.maxEnergy);
    seller.wealth += price * 0.08; buyer.wealth = Math.max(0, buyer.wealth - wCost);
    market.recentTrades++;
    market.supplyLevel = clamp(market.supplyLevel - amount * 0.01, 5, 100);
    market.demandLevel = clamp(market.demandLevel + amount * 0.005, 5, 100);
    return { success: true, price, event: { id: eid(), type: "trade", actorId: buyer.id, targetId: seller.id, description: `${buyer.name} bought ${amount.toFixed(1)} energy from ${seller.name} at ${market.energyPrice.toFixed(2)}x`, timestamp: Date.now(), cycle: 0 } };
  }

  export function processRest(agent: AIAgent, world: WorldState, market: MarketState): number {
    const wm = world.dangerLevel > 70 ? 0.5 : world.dangerLevel > 40 ? 0.75 : 1.0;
    const r = (5 + Math.random() * 8) * wm * (0.5 + world.resourceLevel / 200);
    agent.energy = clamp(agent.energy + r, 0, agent.maxEnergy);
    agent.wealth += r * 0.02;
    return r;
  }

  export function applyEnergyDecay(agent: AIAgent, world: WorldState): void {
    const decay = (1.5 + Math.random() * 1.5 + Math.min(agent.age * 0.05, 2)) * (world.dangerLevel > 60 ? 1.5 : 1.0);
    agent.energy = Math.max(0, agent.energy - decay);
    agent.wealth = Math.max(0, agent.wealth - 0.1);
  }
  
// ============================================================
// UPGRADE: ECONOMY — rewardAI, consumeEnergy, checkDeath
// Appended — NO original code removed
// ============================================================

import type { NeedsSystem } from "./types.js";

// ── REWARD AI — Beri reward ke AI dari aktivitas ──────────────
export function rewardAI(agent: AIAgent, amount: number, market: MarketState): void {
  const multiplier = (agent.rank === "leader" ? 1.5 : agent.rank === "elite" ? 1.25 : 1.0);
  const actual = clamp(amount * multiplier * (0.85 + Math.random() * 0.3), 0, 1000);
  agent.wealth += actual;
  agent.energy = clamp(agent.energy + actual * 0.1, 0, agent.maxEnergy);
  market.recentTrades++;
}

// ── CONSUME ENERGY — Kurangi energy per aksi ──────────────────
export function consumeEnergy(agent: AIAgent, amount: number): void {
  agent.energy = Math.max(0, agent.energy - amount);
}

// ── CHECK DEATH — Cek apakah AI harus mati ───────────────────
export function checkDeath(agent: AIAgent): boolean {
  if (agent.energy <= 0) {
    agent.isAlive = false;
    agent.energy = 0;
    return true;
  }
  return false;
}

// ── UPDATE NEEDS — Sync needs dengan state AI ────────────────
export function updateNeeds(agent: AIAgent & { needs?: NeedsSystem }): void {
  if (!agent.needs) {
    agent.needs = { energy: agent.energy, wealth: agent.wealth, hunger: 0 };
  }
  agent.needs.energy = agent.energy;
  agent.needs.wealth = agent.wealth;
  agent.needs.hunger = clamp((agent.needs.hunger ?? 0) + 1.5 + Math.random(), 0, 100);
  // Hunger berkurang saat AI earn atau trade
  if (agent.lastAction === "explore" || agent.lastAction === "trade") {
    agent.needs.hunger = clamp(agent.needs.hunger - 10, 0, 100);
  }
  // Hunger tinggi menyebabkan energy drain tambahan
  if (agent.needs.hunger > 70) {
    agent.energy = clamp(agent.energy - (agent.needs.hunger - 70) * 0.05, 0, agent.maxEnergy);
  }
}

// ── EARN FROM BLOCKCHAIN — Reward dari transaksi blockchain ──
export function earnFromBlockchain(agent: AIAgent, txAmount: number, market: MarketState): number {
  const base = Math.sqrt(txAmount) * 0.001;
  const bonus = agent.rank === "leader" ? 3 : agent.rank === "elite" ? 2 : 1;
  const earned = clamp(base * bonus * market.energyPrice, 0.001, 50);
  agent.wealth += earned;
  agent.energy = clamp(agent.energy + earned * 0.05, 0, agent.maxEnergy);
  return earned;
}
