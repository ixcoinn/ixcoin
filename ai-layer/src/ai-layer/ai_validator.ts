// ============================================================
// AI_VALIDATOR.TS — Integrasi AI Instance sebagai Validator
// AI bisa menjadi validator jika memenuhi syarat stake & score
// Validator tidak bisa bypass PoW — hanya validasi cepat di mempool
// ============================================================

import type { AIAgent }         from "./types.js";
import type { AIMetrics }       from "./ai_score.js";
import {
  registerValidator,
  listValidators,
  getValidator,
  castVote,
  type Validator,
} from "./validator.js";
import {
  aiValidateTx,
  submitTransaction,
  getFastMempool,
  getMempoolStatus,
  type FastTx,
  type TxValidationResult,
} from "./ai_execution_engine.js";

export interface AIValidatorBinding {
  agentId:     string;
  validatorId: string;
  stake:       number;
  reputation:  number;
  isActive:    boolean;
  registeredAt: number;
}

// ── IN-MEMORY BINDING MAP ─────────────────────────────────────
const _bindings = new Map<string, AIValidatorBinding>();

// ── MINIMUM REQUIREMENTS untuk AI menjadi validator ──────────
const MIN_STAKE_TO_VALIDATE = 50;    // IXC minimum stake
const MIN_SCORE_TO_VALIDATE = 5;     // AI Score minimum
const MIN_AGE_TO_VALIDATE   = 10;    // Minimum usia agent (cycles)

// ── REGISTER AI AS VALIDATOR ──────────────────────────────────
export function registerAIAsValidator(
  agent: AIAgent & { metrics?: AIMetrics; score?: number; balance?: number; ownerWallet?: string },
): AIValidatorBinding | null {
  // Cek apakah AI sudah menjadi validator
  if (_bindings.has(agent.id)) return _bindings.get(agent.id)!;

  // Cek syarat minimum
  if (!agent.isAlive)                          return null;
  if (agent.age < MIN_AGE_TO_VALIDATE)         return null;
  if ((agent.score ?? 0) < MIN_SCORE_TO_VALIDATE) return null;

  const balance = (agent as { balance?: number }).balance ?? 0;
  if (balance < MIN_STAKE_TO_VALIDATE)         return null;

  // Tentukan spesialisasi berdasarkan dominan metric
  const metrics  = (agent as { metrics?: AIMetrics }).metrics;
  let spec: Validator["specialization"] = "general";
  if (metrics) {
    const max = Math.max(metrics.activity, metrics.interaction, metrics.economy, metrics.evolution);
    if (max === metrics.activity)    spec = "activity";
    else if (max === metrics.economy)    spec = "economy";
    else if (max === metrics.evolution)  spec = "evolution";
    else if (max === metrics.interaction) spec = "interaction";
  }

  const stake      = Math.min(balance * 0.2, 1000);   // Max 20% balance, max 1000 IXC
  const reputation = Math.min(1, (agent.score ?? 0) / 50);

  const v = registerValidator({
    name:           `AI-Val-${agent.name.replace(/[^a-zA-Z0-9]/g, "")}`,
    stake,
    reputation,
    specialization: spec,
  });

  const binding: AIValidatorBinding = {
    agentId:      agent.id,
    validatorId:  v.id,
    stake,
    reputation,
    isActive:     true,
    registeredAt: Date.now(),
  };

  _bindings.set(agent.id, binding);
  return binding;
}

// ── AUTO-REGISTER — Cek semua AI tiap siklus ─────────────────
export function autoRegisterValidators(
  agents: Array<AIAgent & { metrics?: AIMetrics; score?: number; balance?: number }>,
): number {
  let registered = 0;
  for (const agent of agents) {
    if (!agent.isAlive) continue;
    if (_bindings.has(agent.id)) continue;
    const binding = registerAIAsValidator(agent as AIAgent & { metrics?: AIMetrics; score?: number; balance?: number; ownerWallet?: string });
    if (binding) registered++;
  }
  return registered;
}

// ── AI VALIDATES TX — AI instance cepat-validasi transaksi ───
export function aiInstanceValidateTx(
  agentId:    string,
  txParams:   Parameters<typeof submitTransaction>[0],
): TxValidationResult | null {
  const binding = _bindings.get(agentId);
  if (!binding || !binding.isActive) return null;

  const tx = submitTransaction(txParams);
  return aiValidateTx(tx, binding.validatorId);
}

// ── DEACTIVATE VALIDATOR — AI mati → validator dinonaktifkan ─
export function deactivateAIValidator(agentId: string): void {
  const binding = _bindings.get(agentId);
  if (!binding) return;
  binding.isActive = false;
}

// ── GET VALIDATOR STATUS ──────────────────────────────────────
export function getAIValidatorStatus() {
  const allValidators = listValidators();
  const aiBindings    = Array.from(_bindings.values());

  return {
    totalValidators:    allValidators.length,
    aiBindings:         aiBindings.length,
    activeAIValidators: aiBindings.filter(b => b.isActive).length,
    mempoolStatus:      getMempoolStatus(),
    validators:         allValidators.slice(0, 20),
  };
}

// ── GET FAST MEMPOOL — Untuk miner (PoW) ─────────────────────
export function getMempoolForMining(): FastTx[] {
  return getFastMempool();
}
