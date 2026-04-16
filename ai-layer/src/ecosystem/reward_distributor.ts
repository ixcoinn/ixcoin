// ============================================================
// REWARD_DISTRIBUTOR.TS — Distribusi Reward Berbasis AI Score
// GANTI sistem lama: tx → reward langsung (DIHAPUS)
// BARU: reward = f(finalScore, validationScore, phase)
// Kirim ke: ai.ownerWallet
// ============================================================

import type { AIAgent }         from "../ai-layer/types.js";
import type { AIMetrics }       from "../ai-layer/ai_score.js";
import type { FinalScoreResult } from "../ai-layer/validation_engine.js";
import {
  runBatchValidation,
  sumFinalScores,
} from "../ai-layer/validation_engine.js";
import {
  drawReward,
  ingestFee,
  getEconomyState,
  syncMainPool,
  type DrawResult,
} from "./sustainable_economy.js";
import { getPoolStatus } from "./pool.js";
import { logger } from "../lib/logger.js";

// ── KONSTANTA ─────────────────────────────────────────────────
const DAILY_POOL_BUDGET  = 1_000;   // IXC per hari untuk distribusi
const MAX_PER_WALLET     = 5;       // IXC max per wallet per distribusi
const MIN_SCORE_THRESHOLD = 0.001;  // Score minimum agar AI layak dapat reward

export interface AgentRewardEntry {
  aiId:            string;
  ownerWallet:     string;
  rawScore:        number;
  validationScore: number;
  finalScore:      number;
  sharePercent:    number;
  rawReward:       number;
  finalReward:     number;
  capped:          boolean;
}

export interface DistributionResult {
  cycle:            number;
  phase:            string;
  totalFinalScore:  number;
  dailyPool:        number;
  totalDistributed: number;
  fromPool:         number;
  fromFee:          number;
  eligibleAgents:   number;
  entries:          AgentRewardEntry[];
  timestamp:        number;
}

// ── MAIN DISTRIBUSI — Dipanggil 1x per hari / per epoch ──────
export async function distributeAIScoreRewards(
  agents: Array<AIAgent & { metrics?: AIMetrics; score?: number; validationScore?: number; ownerWallet?: string; balance?: number }>,
  mainPoolRemaining?: number,
): Promise<DistributionResult> {
  // 1. Sync main pool status
  let poolRemaining = mainPoolRemaining ?? DAILY_POOL_BUDGET;
  try {
    const status = await getPoolStatus();
    poolRemaining = status.remaining;
    syncMainPool(poolRemaining);
  } catch {
    // pool.ts unavailable — menggunakan estimasi
    syncMainPool(poolRemaining);
  }

  // 2. Jalankan batch validation: hitung finalScore tiap AI
  const alive = agents.filter(a => a.isAlive);
  const validationResults: Map<string, FinalScoreResult> = runBatchValidation(alive);

  // 3. Filter AI yang layak (score > threshold, punya ownerWallet)
  const eligible: Array<{ agent: typeof alive[0]; result: FinalScoreResult }> = [];
  for (const agent of alive) {
    const result = validationResults.get(agent.id);
    if (!result) continue;
    if (result.finalScore < MIN_SCORE_THRESHOLD) continue;
    if (!agent.ownerWallet) continue;
    eligible.push({ agent, result });
  }

  if (eligible.length === 0) {
    return {
      cycle: Date.now(), phase: getEconomyState().phaseLabel, totalFinalScore: 0,
      dailyPool: 0, totalDistributed: 0, fromPool: 0, fromFee: 0,
      eligibleAgents: 0, entries: [], timestamp: Date.now(),
    };
  }

  // 4. Hitung total finalScore semua eligible AI
  const totalFinalScore = eligible.reduce((s, { result }) => s + result.finalScore, 0);

  // 5. Hitung budget harian
  const econState  = getEconomyState();
  const dailyPool  = Math.min(DAILY_POOL_BUDGET, econState.dailyBudget);

  let totalDistributed = 0;
  let totalFromPool    = 0;
  let totalFromFee     = 0;
  const entries: AgentRewardEntry[] = [];

  // 6. Distribusi proporsional
  for (const { agent, result } of eligible) {
    const sharePercent = result.finalScore / totalFinalScore;
    const rawReward    = sharePercent * dailyPool;

    // Cap MAX_PER_WALLET
    const finalReward  = parseFloat(Math.min(rawReward, MAX_PER_WALLET).toFixed(8));
    const capped       = rawReward > MAX_PER_WALLET;

    if (finalReward <= 0) continue;

    // Tarik dari sumber ekonomi yang tepat (pool/fee/campuran)
    const draw: DrawResult = drawReward(finalReward, poolRemaining);
    if (!draw.success) continue;

    poolRemaining  = Math.max(0, poolRemaining - draw.fromPool);
    totalFromPool += draw.fromPool;
    totalFromFee  += draw.fromFee;

    // Kredit ke balance AI (dikirim ke ownerWallet secara on-chain)
    agent.balance = (agent.balance ?? 0) + draw.amount;

    totalDistributed += draw.amount;

    entries.push({
      aiId:            agent.id,
      ownerWallet:     agent.ownerWallet!,
      rawScore:        result.rawScore,
      validationScore: result.validationScore,
      finalScore:      result.finalScore,
      sharePercent:    parseFloat((sharePercent * 100).toFixed(4)),
      rawReward:       parseFloat(rawReward.toFixed(8)),
      finalReward:     draw.amount,
      capped,
    });
  }

  logger.info({
    eligibleAgents: eligible.length,
    totalDistributed: totalDistributed.toFixed(4),
    phase: econState.phase,
    fromPool: totalFromPool.toFixed(4),
    fromFee:  totalFromFee.toFixed(4),
  }, "AI Score reward distribution complete");

  return {
    cycle:            Date.now(),
    phase:            econState.phaseLabel,
    totalFinalScore:  parseFloat(totalFinalScore.toFixed(6)),
    dailyPool,
    totalDistributed: parseFloat(totalDistributed.toFixed(8)),
    fromPool:         parseFloat(totalFromPool.toFixed(8)),
    fromFee:          parseFloat(totalFromFee.toFixed(8)),
    eligibleAgents:   entries.length,
    entries,
    timestamp:        Date.now(),
  };
}

// ── INGEST FEE — Dipanggil setiap ada transaksi (chain + AI internal) ─
export function collectTxFee(params: {
  txFee:       number;
  priorityFee?: number;
  serviceFee?:  number;
}): void {
  ingestFee(params.txFee, params.priorityFee ?? 0, params.serviceFee ?? 0);
}

// ── AI LIVING COST — Potong biaya hidup dari balance AI ──────
const BASE_LIVING_COST = 0.01;   // IXC per siklus sebagai biaya dasar

export function applyLivingCost(
  agent: AIAgent & { metrics?: AIMetrics; score?: number; balance?: number },
): boolean {
  const activity   = agent.metrics?.activity ?? 0;
  const livingCost = parseFloat((BASE_LIVING_COST * (1 + activity * 0.01)).toFixed(8));

  agent.balance = (agent.balance ?? 0) - livingCost;

  if ((agent.balance ?? 0) <= 0) {
    agent.balance = 0;
    agent.isAlive = false;
    return true;   // AI mati karena kehabisan balance
  }
  return false;
}

// ── GET DISTRIBUTION STATS ────────────────────────────────────
export function getDistributorInfo() {
  return {
    dailyPoolBudget:   DAILY_POOL_BUDGET,
    maxPerWallet:      MAX_PER_WALLET,
    minScoreThreshold: MIN_SCORE_THRESHOLD,
    economy:           getEconomyState(),
  };
}
