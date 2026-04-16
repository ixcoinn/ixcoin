// ============================================================
// SUSTAINABLE_ECONOMY.TS — Ekonomi Berkelanjutan IXCoin AI
// FASE 1: 100% dari pool 5 juta IXC
// FASE 2: campuran pool + fee economy
// FASE 3: 100% fee economy (pool habis)
// Sumber fee: tx.fee + tx.priorityFee + ai.serviceFee
// ============================================================

export type EconomyPhase = "PHASE_1" | "PHASE_2" | "PHASE_3";

export interface RewardPoolState {
  phase:                  EconomyPhase;
  mainPoolRemaining:      number;    // sisa 5 juta IXC
  feePoolAccumulated:     number;    // total fee yang terkumpul
  totalDistributed:       number;    // total pernah didistribusikan
  dailyBudget:            number;    // budget harian yang dihitung dinamis
  lastPhaseCheckAt:       number;
  lastFeeIngest:          number;
}

// ── KONSTANTA THRESHOLD FASE ──────────────────────────────────
const PHASE1_THRESHOLD  = 5_000_000 * 0.50;   // >50% pool: FASE 1
const PHASE2_THRESHOLD  = 5_000_000 * 0.05;   // 5%–50% pool: FASE 2 (campuran)
                                               // <5% pool: FASE 3 (full fee)

const DAILY_EMISSION_CAP = 1_000;   // IXC max per hari dari pool
const FEE_SHARE_RATIO    = 0.85;    // 85% dari fee masuk reward pool, 15% treasury
const PHASE2_FEE_RATIO   = 0.5;     // FASE 2: 50% pool, 50% fee
const PHASE2_POOL_RATIO  = 0.5;

// ── SINGLETON STATE ───────────────────────────────────────────
let _state: RewardPoolState = {
  phase:              "PHASE_1",
  mainPoolRemaining:  5_000_000,
  feePoolAccumulated: 0,
  totalDistributed:   0,
  dailyBudget:        DAILY_EMISSION_CAP,
  lastPhaseCheckAt:   Date.now(),
  lastFeeIngest:      0,
};

// ── INGEST FEE — Sumber masuk: tx.fee + priorityFee + serviceFee ─
export function ingestFee(txFee: number, priorityFee: number, serviceFee = 0): void {
  const totalFee   = txFee + priorityFee + serviceFee;
  const rewardCut  = totalFee * FEE_SHARE_RATIO;
  _state.feePoolAccumulated += rewardCut;
  _state.lastFeeIngest       = Date.now();
}

// ── DETECT PHASE — Tentukan fase berdasarkan sisa pool ───────
export function detectPhase(remaining: number): EconomyPhase {
  if (remaining > PHASE1_THRESHOLD)                                  return "PHASE_1";
  if (remaining > PHASE2_THRESHOLD && remaining <= PHASE1_THRESHOLD) return "PHASE_2";
  return "PHASE_3";
}

// ── UPDATE PHASE — Sync phase dengan sisa pool ───────────────
export function updatePhase(mainPoolRemaining: number): EconomyPhase {
  const newPhase = detectPhase(mainPoolRemaining);
  if (_state.phase !== newPhase) {
    _state.phase              = newPhase;
    _state.mainPoolRemaining  = mainPoolRemaining;
    _state.lastPhaseCheckAt   = Date.now();
  }
  _state.mainPoolRemaining = mainPoolRemaining;
  return newPhase;
}

// ── CALCULATE AVAILABLE DAILY BUDGET ─────────────────────────
export function calculateDailyBudget(mainPoolRemaining: number): number {
  const phase = detectPhase(mainPoolRemaining);

  switch (phase) {
    case "PHASE_1": {
      // 100% dari pool, capped by DAILY_EMISSION_CAP
      return Math.min(DAILY_EMISSION_CAP, mainPoolRemaining);
    }
    case "PHASE_2": {
      // Campuran pool + fee
      const fromPool = Math.min(mainPoolRemaining * 0.001, DAILY_EMISSION_CAP * PHASE2_POOL_RATIO);
      const fromFee  = _state.feePoolAccumulated * PHASE2_FEE_RATIO;
      return fromPool + fromFee;
    }
    case "PHASE_3": {
      // 100% dari fee economy — tidak menggunakan pool
      return _state.feePoolAccumulated * 0.8; // distribusi 80% dari fee harian
    }
  }
}

// ── DRAW FROM POOL — Tarik reward dari sumber yang tepat ─────
export interface DrawResult {
  amount:      number;
  fromPool:    number;
  fromFee:     number;
  phase:       EconomyPhase;
  success:     boolean;
  reason?:     string;
}

export function drawReward(requested: number, mainPoolRemaining: number): DrawResult {
  const phase         = updatePhase(mainPoolRemaining);
  const dailyBudget   = calculateDailyBudget(mainPoolRemaining);
  const safeAmount    = Math.min(requested, dailyBudget);

  if (safeAmount <= 0) {
    return { amount: 0, fromPool: 0, fromFee: 0, phase, success: false, reason: "No budget available" };
  }

  let fromPool = 0;
  let fromFee  = 0;

  switch (phase) {
    case "PHASE_1":
      fromPool = Math.min(safeAmount, mainPoolRemaining);
      break;

    case "PHASE_2": {
      const poolShare = safeAmount * PHASE2_POOL_RATIO;
      const feeShare  = safeAmount * PHASE2_FEE_RATIO;
      fromPool = Math.min(poolShare, mainPoolRemaining);
      fromFee  = Math.min(feeShare, _state.feePoolAccumulated);
      break;
    }

    case "PHASE_3":
      fromFee = Math.min(safeAmount, _state.feePoolAccumulated);
      break;
  }

  const total = fromPool + fromFee;
  if (total <= 0) {
    return { amount: 0, fromPool: 0, fromFee: 0, phase, success: false, reason: "Pool and fee reserves empty" };
  }

  // Deduct dari fee pool
  _state.feePoolAccumulated = Math.max(0, _state.feePoolAccumulated - fromFee);
  _state.totalDistributed  += total;

  return {
    amount:   parseFloat(total.toFixed(8)),
    fromPool: parseFloat(fromPool.toFixed(8)),
    fromFee:  parseFloat(fromFee.toFixed(8)),
    phase,
    success:  true,
  };
}

// ── GET ECONOMY STATE ─────────────────────────────────────────
export function getEconomyState(): RewardPoolState & {
  dailyBudget:  number;
  phaseLabel:   string;
  feeTreasury:  number;
} {
  const phaseLabels: Record<EconomyPhase, string> = {
    PHASE_1: "Pool Economy (100% 5M pool)",
    PHASE_2: "Hybrid Economy (pool + fee)",
    PHASE_3: "Fee Economy (100% sustainable)",
  };

  return {
    ..._state,
    dailyBudget: calculateDailyBudget(_state.mainPoolRemaining),
    phaseLabel:  phaseLabels[_state.phase],
    feeTreasury: _state.feePoolAccumulated * (1 - FEE_SHARE_RATIO),
  };
}

// ── SYNC MAIN POOL — Dipanggil setelah pool.ts mendistribusikan ─
export function syncMainPool(remaining: number): void {
  _state.mainPoolRemaining = remaining;
  _state.phase             = detectPhase(remaining);
}
