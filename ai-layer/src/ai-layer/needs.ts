// ============================================================
// NEEDS.TS — Sistem Kebutuhan Dasar AI (NEW FILE)
// Setiap AI memiliki: energy, wealth, hunger
// Dipanggil dari: loop.ts setiap tick
// ============================================================

import type { AIAgent, NeedsSystem } from "./types.js";

function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }

// ── DEFAULT NEEDS — Inisialisasi awal ─────────────────────────
export function createNeeds(agent?: Partial<AIAgent>): NeedsSystem {
  return {
    energy: agent?.energy ?? 60,
    wealth: agent?.wealth ?? 10,
    hunger: 0,
  };
}

// ── TICK NEEDS — Dijalankan setiap loop ───────────────────────
export function tickNeeds(agent: AIAgent & { needs?: NeedsSystem }): void {
  if (!agent.needs) agent.needs = createNeeds(agent);

  const n = agent.needs;

  // Energy di needs = sync dengan agent.energy
  n.energy = agent.energy;
  n.wealth = agent.wealth;

  // Hunger naik setiap tick
  n.hunger = clamp(n.hunger + 1.2 + Math.random() * 0.8, 0, 100);

  // Makan saat trade/earn
  if (agent.lastAction === "explore" || agent.lastAction === "trade") {
    n.hunger = clamp(n.hunger - 15, 0, 100);
  }
  if (agent.lastAction === "rest") {
    n.hunger = clamp(n.hunger - 8, 0, 100);
  }

  // Hunger tinggi → drain energy
  if (n.hunger > 60) {
    const drain = (n.hunger - 60) * 0.04;
    agent.energy = clamp(agent.energy - drain, 0, agent.maxEnergy);
    n.energy = agent.energy;
  }

  // Hunger kritis → AI mempertimbangkan ulang goal
  if (n.hunger > 85 && agent.goals.primaryGoal !== "survive") {
    agent.goals.secondaryGoals.push(`prev:${agent.goals.primaryGoal}`);
    agent.goals.primaryGoal = "survive";
  }
}

// ── SATISFY HUNGER — Makan (konsumsi resource) ───────────────
export function satisfyHunger(agent: AIAgent & { needs?: NeedsSystem }, amount: number): void {
  if (!agent.needs) agent.needs = createNeeds(agent);
  agent.needs.hunger = clamp(agent.needs.hunger - amount, 0, 100);
  agent.energy = clamp(agent.energy + amount * 0.3, 0, agent.maxEnergy);
}

// ── GET NEEDS SUMMARY — Ringkasan status kebutuhan ───────────
export function getNeedsSummary(agent: AIAgent & { needs?: NeedsSystem }): {
  status:   "dying" | "critical" | "hungry" | "stable" | "thriving";
  details:  string;
} {
  const n = agent.needs ?? createNeeds(agent);
  const energyPct = (agent.energy / agent.maxEnergy) * 100;

  if (energyPct < 10)   return { status: "dying",    details: `energy=${energyPct.toFixed(0)}%, hunger=${n.hunger.toFixed(0)}` };
  if (energyPct < 25)   return { status: "critical",  details: `energy=${energyPct.toFixed(0)}%, hunger=${n.hunger.toFixed(0)}` };
  if (n.hunger > 70)    return { status: "hungry",    details: `hunger=${n.hunger.toFixed(0)}, wealth=${n.wealth.toFixed(1)}` };
  if (energyPct > 70 && n.wealth > 50) return { status: "thriving", details: `energy=${energyPct.toFixed(0)}%, wealth=${n.wealth.toFixed(1)}` };
  return { status: "stable", details: `energy=${energyPct.toFixed(0)}%, hunger=${n.hunger.toFixed(0)}` };
}

// ── NEEDS DRIVEN PRIORITY — Tentukan aksi berdasarkan needs ──
export function needsDrivenPriority(agent: AIAgent & { needs?: NeedsSystem }): "SEARCH_ENERGY" | "EARN_WEALTH" | "EXPLORE" | null {
  const n = agent.needs ?? createNeeds(agent);
  const energyPct = (agent.energy / agent.maxEnergy) * 100;

  if (energyPct < 20)  return "SEARCH_ENERGY";   // Darurat energy
  if (n.hunger > 75)   return "EARN_WEALTH";      // Lapar → cari kekayaan
  if (n.wealth < 5)    return "EARN_WEALTH";      // Miskin → earn
  return null;                                     // Bebas pilih
}
