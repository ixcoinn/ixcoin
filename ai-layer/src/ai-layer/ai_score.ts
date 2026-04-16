// ============================================================
// AI_SCORE.TS — AI Score System
// Menghitung kontribusi nyata AI sebagai dasar reward
// Formula: score = activity×0.4 + interaction×0.2 + economy×0.2 + evolution×0.2
// ============================================================

import type { AIAgent } from "./types.js";

export interface AIMetrics {
  activity:    number;
  interaction: number;
  economy:     number;
  evolution:   number;
}

export interface AIScoreResult {
  score:       number;
  metrics:     AIMetrics;
  breakdown: {
    activityContrib:    number;
    interactionContrib: number;
    economyContrib:     number;
    evolutionContrib:   number;
  };
}

// ── HITUNG AI SCORE dari metrics ──────────────────────────────
export function calculateAIScore(metrics: AIMetrics): number {
  const score =
    metrics.activity    * 0.4 +
    metrics.interaction * 0.2 +
    metrics.economy     * 0.2 +
    metrics.evolution   * 0.2;
  return Math.max(0, parseFloat(score.toFixed(6)));
}

// ── SCORE RESULT DETAIL ───────────────────────────────────────
export function calculateAIScoreDetailed(metrics: AIMetrics): AIScoreResult {
  const activityContrib    = metrics.activity    * 0.4;
  const interactionContrib = metrics.interaction * 0.2;
  const economyContrib     = metrics.economy     * 0.2;
  const evolutionContrib   = metrics.evolution   * 0.2;
  const score = activityContrib + interactionContrib + economyContrib + evolutionContrib;
  return {
    score: Math.max(0, parseFloat(score.toFixed(6))),
    metrics,
    breakdown: { activityContrib, interactionContrib, economyContrib, evolutionContrib },
  };
}

// ── DECAY METRICS — Tiap siklus, nilai lama memudar ──────────
export function decayMetrics(metrics: AIMetrics): AIMetrics {
  return {
    activity:    parseFloat((metrics.activity    * 0.98).toFixed(6)),
    interaction: parseFloat((metrics.interaction * 0.98).toFixed(6)),
    economy:     parseFloat((metrics.economy     * 0.98).toFixed(6)),
    evolution:   parseFloat((metrics.evolution   * 0.99).toFixed(6)),
  };
}

// ── INIT METRICS — Default metrics untuk AI baru ─────────────
export function initMetrics(): AIMetrics {
  return { activity: 0, interaction: 0, economy: 0, evolution: 0 };
}

// ── UPDATE METRICS dari aksi AI saat ini ─────────────────────
export function updateMetricsFromAction(
  metrics: AIMetrics,
  action: string,
  agent: AIAgent,
): AIMetrics {
  const m = { ...metrics };

  // Activity: setiap aksi apapun menambah activity score
  if (action !== "ignore") {
    m.activity = Math.min(100, m.activity + 1.0 + agent.actionCount * 0.001);
  }

  // Interaction: dari aksi sosial
  if (["trade", "cooperate", "attack", "recruit", "betray"].includes(action)) {
    m.interaction = Math.min(100, m.interaction + 2.5);
  }

  // Economy: dari perdagangan dan kekayaan
  const wealthBonus = Math.min(agent.wealth / 100, 1.0) * 1.5;
  if (["trade", "explore"].includes(action)) {
    m.economy = Math.min(100, m.economy + 1.5 + wealthBonus);
  }

  // Evolution: dari umur, generasi, dan adaptasi
  const evolutionGain = 0.1 + agent.evolution.adaptationScore * 0.01 + agent.evolution.generationsSurvived * 0.05;
  m.evolution = Math.min(100, m.evolution + evolutionGain);

  return m;
}

// ── GET METRICS dari agent (type-safe) ───────────────────────
export function getAgentMetrics(agent: AIAgent & { metrics?: AIMetrics }): AIMetrics {
  return agent.metrics ?? initMetrics();
}

// ── SET METRICS ke agent ──────────────────────────────────────
export function setAgentMetrics(agent: AIAgent & { metrics?: AIMetrics; score?: number }, metrics: AIMetrics): void {
  agent.metrics = metrics;
  agent.score   = calculateAIScore(metrics);
}
