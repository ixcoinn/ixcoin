// ============================================================
// VALIDATION_ENGINE.TS — Mesin Validasi Score AI
// Orchestrasi: validator.ts + ai_score.ts
// Output: finalScore = ai.score × ai.validationScore
// ============================================================

import type { AIAgent } from "./types.js";
import type { AIMetrics } from "./ai_score.js";
import {
  calculateAIScore,
  decayMetrics,
  updateMetricsFromAction,
  initMetrics,
} from "./ai_score.js";
import {
  listValidators,
  castVote,
  getValidationResult,
  getValidatorWeight,
} from "./validator.js";

export interface FinalScoreResult {
  aiId:            string;
  rawScore:        number;
  validationScore: number;
  finalScore:      number;
  metrics:         AIMetrics;
}

// ── COMPUTE VALIDATOR VOTE SCORE untuk AI berdasarkan metrics ─
function computeValidatorVote(
  validatorId:    string,
  specialization: string,
  metrics:         AIMetrics,
  agent:           AIAgent,
): number {
  let base = 0.5;

  switch (specialization) {
    case "activity":
      base = Math.min(1, metrics.activity / 80);
      break;
    case "economy":
      base = Math.min(1, metrics.economy / 80 + (agent.wealth / 200));
      break;
    case "evolution":
      base = Math.min(1, metrics.evolution / 80 + agent.evolution.generationsSurvived * 0.05);
      break;
    case "interaction":
      base = Math.min(1, metrics.interaction / 80 + agent.relations.friends.length * 0.02);
      break;
    case "general":
    default: {
      const rawScore = calculateAIScore(metrics);
      base = Math.min(1, rawScore / 50);
    }
  }

  // Tambah noise kecil agar tidak deterministic sempurna
  return Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.05));
}

// ── RUN VALIDATION — Semua validator memberikan vote ke AI ────
export function runValidation(
  agent:   AIAgent & { metrics?: AIMetrics; score?: number; validationScore?: number },
): FinalScoreResult {
  const metrics  = agent.metrics ?? initMetrics();
  const rawScore = agent.score   ?? calculateAIScore(metrics);

  const validators = listValidators().filter(v => v.isActive);

  for (const v of validators) {
    const voteScore = computeValidatorVote(v.id, v.specialization ?? "general", metrics, agent);
    castVote(v.id, agent.id, voteScore);
  }

  const result         = getValidationResult(agent.id);
  const validationScore = result.validationScore;
  const finalScore      = parseFloat((rawScore * validationScore).toFixed(6));

  agent.validationScore = validationScore;

  return {
    aiId:            agent.id,
    rawScore,
    validationScore,
    finalScore,
    metrics,
  };
}

// ── BATCH RUN VALIDATION — Semua AI dalam satu siklus ────────
export function runBatchValidation(
  agents: Array<AIAgent & { metrics?: AIMetrics; score?: number; validationScore?: number }>,
): Map<string, FinalScoreResult> {
  const results = new Map<string, FinalScoreResult>();
  for (const agent of agents.filter(a => a.isAlive)) {
    const r = runValidation(agent);
    results.set(agent.id, r);
  }
  return results;
}

// ── TOTAL FINAL SCORE — Jumlah semua finalScore untuk kalkulasi reward
export function sumFinalScores(results: Map<string, FinalScoreResult>): number {
  let total = 0;
  for (const r of results.values()) total += r.finalScore;
  return parseFloat(total.toFixed(6));
}

// ── UPDATE METRICS — Dipanggil dari loop.ts tiap siklus ──────
export function updateAgentMetrics(
  agent:  AIAgent & { metrics?: AIMetrics; score?: number },
  action: string,
): void {
  const current = agent.metrics ?? initMetrics();
  const decayed = decayMetrics(current);
  const updated = updateMetricsFromAction(decayed, action, agent);
  agent.metrics = updated;
  agent.score   = calculateAIScore(updated);
}
