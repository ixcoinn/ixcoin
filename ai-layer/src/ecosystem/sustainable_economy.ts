// ============================================================
// SUSTAINABLE_ECONOMY.TS — Ekonomi Berkelanjutan IXCoin AI
// [FIX] _state hanya CACHE — sumber kebenaran adalah DB (pool.ts / blockchain).
//       Setiap operasi penting HARUS sync dari DB terlebih dahulu.
//       Memory digunakan untuk efisiensi baca, BUKAN untuk menulis state final.
// FASE 1: 100% dari pool 5 juta IXC
// FASE 2: campuran pool + fee economy
// FASE 3: 100% fee economy (pool habis)
// ============================================================

export type EconomyPhase = "PHASE_1" | "PHASE_2" | "PHASE_3";

export interface RewardPoolState {
  phase:                  EconomyPhase;
  mainPoolRemaining:      number;    // cache — sumber asli dari DB/pool.ts
  feePoolAccumulated:     number;    // cache — harus disync dari DB
  totalDistributed:       number;    // cache — sumber asli dari DB
  dailyBudget:            number;    // dihitung dinamis dari cache
  lastPhaseCheckAt:       number;
  lastFeeIngest:          number;
  isCacheStale:           boolean;   // [FIX] flag: cache perlu diperbarui dari DB
  lastSyncedAt:           number;    // [FIX] kapan terakhir sync dengan DB
}

// ── KONSTANTA THRESHOLD FASE ──────────────────────────────────
const PHASE1_THRESHOLD   = 5_000_000 * 0.50;
const PHASE2_THRESHOLD   = 5_000_000 * 0.05;
const DAILY_EMISSION_CAP = 1_000;
const FEE_SHARE_RATIO    = 0.85;
const PHASE2_FEE_RATIO   = 0.5;
const PHASE2_POOL_RATIO  = 0.5;

// ── CACHE TTL — Cache kadaluwarsa setelah 60 detik ───────────
// [FIX] Setelah TTL habis, state harus di-refresh dari DB/blockchain
const CACHE_TTL_MS = 60_000;

// ── CACHE STATE — BUKAN SUMBER KEBENARAN ─────────────────────
// [FIX] _state adalah CACHE SEMENTARA.
//       Nilai mainPoolRemaining berasal dari pool.ts yang membaca DB.
//       Jangan pernah percaya _state sebagai angka final tanpa sync.
let _state: RewardPoolState = {
  phase:              "PHASE_1",
  mainPoolRemaining:  5_000_000,  // nilai awal — akan di-overwrite saat sync DB
  feePoolAccumulated: 0,
  totalDistributed:   0,
  dailyBudget:        DAILY_EMISSION_CAP,
  lastPhaseCheckAt:   Date.now(),
  lastFeeIngest:      0,
  isCacheStale:       true,   // mulai sebagai stale — wajib sync sebelum digunakan
  lastSyncedAt:       0,
};

// ── CALLBACK SYNC — Diset oleh pool.ts saat init ─────────────
// [FIX] pool.ts mendaftarkan fungsi getPoolStatus() di sini agar
//       sustainable_economy bisa fetch data real dari DB.
let _poolStatusFetcher: (() => Promise<{ remaining: number; distributed: number }>) | null = null;

export function registerPoolStatusFetcher(
  fn: () => Promise<{ remaining: number; distributed: number }>,
): void {
  _poolStatusFetcher = fn;
}

// ── SYNC FROM DB — Ambil data pool nyata dari blockchain/DB ──
// [FIX] Fungsi ini WAJIB dipanggil sebelum operasi apapun yang
//       membutuhkan data pool yang akurat.
export async function syncFromDatabase(): Promise<boolean> {
  if (!_poolStatusFetcher) {
    _state.isCacheStale = true;
    return false; // tidak bisa sync — pool fetcher belum terdaftar
  }

  try {
    const status = await _poolStatusFetcher();
    _state.mainPoolRemaining  = status.remaining;
    _state.totalDistributed   = status.distributed;
    _state.phase              = detectPhase(status.remaining);
    _state.dailyBudget        = calculateDailyBudget(status.remaining);
    _state.lastPhaseCheckAt   = Date.now();
    _state.lastSyncedAt       = Date.now();
    _state.isCacheStale       = false;
    return true;
  } catch {
    _state.isCacheStale = true;
    return false;
  }
}

// ── CACHE HEALTH CHECK — Apakah cache masih valid? ───────────
export function isCacheValid(): boolean {
  return !_state.isCacheStale && (Date.now() - _state.lastSyncedAt) < CACHE_TTL_MS;
}

// ── DETECT PHASE ──────────────────────────────────────────────
export function detectPhase(remaining: number): EconomyPhase {
  if (remaining > PHASE1_THRESHOLD)                                  return "PHASE_1";
  if (remaining > PHASE2_THRESHOLD && remaining <= PHASE1_THRESHOLD) return "PHASE_2";
  return "PHASE_3";
}

// ── UPDATE PHASE — Sync phase dengan sisa pool ───────────────
export function updatePhase(mainPoolRemaining: number): EconomyPhase {
  const newPhase = detectPhase(mainPoolRemaining);
  if (_state.phase !== newPhase) {
    _state.phase             = newPhase;
    _state.lastPhaseCheckAt  = Date.now();
  }
  _state.mainPoolRemaining = mainPoolRemaining;
  return newPhase;
}

// ── CALCULATE DAILY BUDGET ────────────────────────────────────
export function calculateDailyBudget(mainPoolRemaining: number): number {
  const phase = detectPhase(mainPoolRemaining);
  switch (phase) {
    case "PHASE_1": return Math.min(DAILY_EMISSION_CAP, mainPoolRemaining);
    case "PHASE_2": {
      const fromPool = Math.min(mainPoolRemaining * 0.001, DAILY_EMISSION_CAP * PHASE2_POOL_RATIO);
      const fromFee  = _state.feePoolAccumulated * PHASE2_FEE_RATIO;
      return fromPool + fromFee;
    }
    case "PHASE_3": return _state.feePoolAccumulated * 0.8;
  }
}

// ── DRAW REWARD — Kalkulasi sumber reward ─────────────────────
// [FIX] drawReward TIDAK mengubah state final blockchain.
//       Output DrawResult hanya digunakan untuk membuat PendingRewardTx.
//       Pengurangan pool nyata terjadi di blockchain saat PoW konfirmasi.
export interface DrawResult {
  amount:      number;
  fromPool:    number;
  fromFee:     number;
  phase:       EconomyPhase;
  success:     boolean;
  reason?:     string;
  cacheValid:  boolean; // [FIX] informasi apakah kalkulasi menggunakan cache valid
}

export function drawReward(requested: number, mainPoolRemaining: number): DrawResult {
  // [FIX] Tandai apakah cache valid saat kalkulasi ini dibuat
  const cacheValid = isCacheValid();

  const phase       = updatePhase(mainPoolRemaining);
  const dailyBudget = calculateDailyBudget(mainPoolRemaining);
  const safeAmount  = Math.min(requested, dailyBudget);

  if (safeAmount <= 0) {
    return { amount: 0, fromPool: 0, fromFee: 0, phase, success: false, reason: "No budget available", cacheValid };
  }

  let fromPool = 0;
  let fromFee  = 0;

  switch (phase) {
    case "PHASE_1":
      fromPool = Math.min(safeAmount, mainPoolRemaining);
      break;
    case "PHASE_2": {
      fromPool = Math.min(safeAmount * PHASE2_POOL_RATIO, mainPoolRemaining);
      fromFee  = Math.min(safeAmount * PHASE2_FEE_RATIO, _state.feePoolAccumulated);
      break;
    }
    case "PHASE_3":
      fromFee = Math.min(safeAmount, _state.feePoolAccumulated);
      break;
  }

  const total = fromPool + fromFee;
  if (total <= 0) {
    return { amount: 0, fromPool: 0, fromFee: 0, phase, success: false, reason: "Reserves empty", cacheValid };
  }

  // [FIX] Hanya kurangi dari fee cache (fee yang masuk dari tx).
  //       Pool reduction TIDAK terjadi di sini — terjadi di blockchain layer
  //       saat PoW mengkonfirmasi reward TX.
  _state.feePoolAccumulated = Math.max(0, _state.feePoolAccumulated - fromFee);
  // Tandai cache stale setelah ada perubahan — paksa sync berikutnya dari DB
  if (fromPool > 0) _state.isCacheStale = true;

  return {
    amount:     parseFloat(total.toFixed(8)),
    fromPool:   parseFloat(fromPool.toFixed(8)),
    fromFee:    parseFloat(fromFee.toFixed(8)),
    phase,
    success:    true,
    cacheValid,
  };
}

// ── INGEST FEE — Fee dari transaksi on-chain masuk ke sini ───
export function ingestFee(txFee: number, priorityFee: number, serviceFee = 0): void {
  const totalFee  = txFee + priorityFee + serviceFee;
  const rewardCut = totalFee * FEE_SHARE_RATIO;
  _state.feePoolAccumulated += rewardCut;
  _state.lastFeeIngest       = Date.now();
}

// ── SYNC MAIN POOL — Dipanggil setelah dapat data dari pool.ts ─
// [FIX] Ini yang menggantikan _state sebagai sumber kebenaran.
//       Dipanggil oleh reward_distributor.ts setelah fetch dari DB.
export function syncMainPool(remaining: number): void {
  _state.mainPoolRemaining = remaining;
  _state.phase             = detectPhase(remaining);
  _state.dailyBudget       = calculateDailyBudget(remaining);
  _state.lastSyncedAt      = Date.now();
  _state.isCacheStale      = false;
}

// ── GET ECONOMY STATE — Baca cache (untuk display/logging saja) ─
// [FIX] Jangan gunakan getEconomyState() untuk keputusan finansial.
//       Panggil syncFromDatabase() dulu jika butuh data akurat.
export function getEconomyState(): RewardPoolState & {
  dailyBudget: number;
  phaseLabel:  string;
  feeTreasury: number;
  warning:     string;
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
    warning:     _state.isCacheStale
      ? "CACHE_STALE: data mungkin tidak akurat — panggil syncFromDatabase() sebelum operasi finansial"
      : "CACHE_OK",
  };
}
