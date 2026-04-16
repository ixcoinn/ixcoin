// ============================================================
// AI_EXECUTION_ENGINE.TS — AI Execution Layer
// Transaksi cepat divalidasi oleh AI sebelum masuk ke PoW miner
// PoW tetap sebagai konfirmasi final — AI tidak bisa bypass ini
// ============================================================

export type TxStatus = "PENDING" | "AI_APPROVED" | "AI_REJECTED" | "POW_CONFIRMED" | "REJECTED";

export interface FastTx {
  id:            string;
  from:          string;
  to:            string;
  amount:        number;
  fee:           number;
  priorityFee:   number;
  priorityScore: number;
  status:        TxStatus;
  aiValidatorId: string | null;
  aiDecisionAt:  number | null;
  submittedAt:   number;
  memo?:         string;
}

export interface TxValidationResult {
  txId:          string;
  approved:      boolean;
  reason:        string;
  priorityScore: number;
}

// ── IN-MEMORY FAST MEMPOOL — Hanya AI-approved tx ────────────
const fastMempool: FastTx[] = [];
const rejectedPool: FastTx[] = [];
let   _totalFeeCollected = 0;

const MIN_TX_AMOUNT   = 0.001;
const MIN_FEE         = 0.0001;
const MAX_MEMPOOL_SIZE = 1000;

// ── SUBMIT TRANSACTION — User kirim transaksi ke AI layer ────
export function submitTransaction(params: {
  from:         string;
  to:           string;
  amount:       number;
  fee:          number;
  priorityFee?: number;
  memo?:        string;
}): FastTx {
  const tx: FastTx = {
    id:            `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    from:          params.from,
    to:            params.to,
    amount:        params.amount,
    fee:           params.fee,
    priorityFee:   params.priorityFee ?? 0,
    priorityScore: 0,
    status:        "PENDING",
    aiValidatorId: null,
    aiDecisionAt:  null,
    submittedAt:   Date.now(),
    memo:          params.memo,
  };
  return tx;
}

// ── AI VALIDATE TX — AI cepat validasi transaksi ─────────────
export function aiValidateTx(tx: FastTx, validatorAiId: string): TxValidationResult {
  // ATURAN KEAMANAN: AI tidak boleh ubah jumlah, hanya approve/reject
  if (tx.amount < MIN_TX_AMOUNT) {
    tx.status = "AI_REJECTED";
    tx.aiDecisionAt = Date.now();
    tx.aiValidatorId = validatorAiId;
    rejectedPool.push(tx);
    return { txId: tx.id, approved: false, reason: `Amount ${tx.amount} below minimum ${MIN_TX_AMOUNT}`, priorityScore: 0 };
  }

  if (tx.fee < MIN_FEE) {
    tx.status = "AI_REJECTED";
    tx.aiDecisionAt = Date.now();
    tx.aiValidatorId = validatorAiId;
    rejectedPool.push(tx);
    return { txId: tx.id, approved: false, reason: `Fee ${tx.fee} below minimum ${MIN_FEE}`, priorityScore: 0 };
  }

  if (tx.from === tx.to) {
    tx.status = "AI_REJECTED";
    tx.aiDecisionAt = Date.now();
    tx.aiValidatorId = validatorAiId;
    rejectedPool.push(tx);
    return { txId: tx.id, approved: false, reason: "Self-transfer not allowed", priorityScore: 0 };
  }

  if (fastMempool.length >= MAX_MEMPOOL_SIZE) {
    tx.status = "AI_REJECTED";
    tx.aiDecisionAt = Date.now();
    tx.aiValidatorId = validatorAiId;
    rejectedPool.push(tx);
    return { txId: tx.id, approved: false, reason: "Mempool full", priorityScore: 0 };
  }

  // Hitung priority score: fee + priorityFee relatif terhadap amount
  const feeRatio     = (tx.fee + tx.priorityFee) / tx.amount;
  const priorityScore = Math.min(100, feeRatio * 1000 + tx.priorityFee * 100);

  tx.status         = "AI_APPROVED";
  tx.priorityScore  = parseFloat(priorityScore.toFixed(4));
  tx.aiDecisionAt   = Date.now();
  tx.aiValidatorId  = validatorAiId;

  // Fee masuk ke rewardPool
  _totalFeeCollected += tx.fee + tx.priorityFee;

  // Masuk fast mempool, sorted by priorityScore descending
  fastMempool.push(tx);
  fastMempool.sort((a, b) => b.priorityScore - a.priorityScore);
  if (fastMempool.length > MAX_MEMPOOL_SIZE) fastMempool.splice(MAX_MEMPOOL_SIZE);

  return { txId: tx.id, approved: true, reason: "AI_APPROVED — awaiting PoW confirmation", priorityScore };
}

// ── SELECT FOR MINING — Miner ambil tx dari fast mempool ─────
// PENTING: Hanya PoW yang bisa konfirmasi block final
export function selectForMining(maxTx = 500): FastTx[] {
  return fastMempool.slice(0, maxTx);
}

// ── CONFIRM BY POW — PoW miner konfirmasi tx dari mempool ────
export function confirmByPoW(txIds: string[]): number {
  let confirmed = 0;
  for (const id of txIds) {
    const idx = fastMempool.findIndex(t => t.id === id);
    if (idx !== -1) {
      fastMempool[idx].status = "POW_CONFIRMED";
      fastMempool.splice(idx, 1);
      confirmed++;
    }
  }
  return confirmed;
}

// ── GET MEMPOOL STATUS ────────────────────────────────────────
export function getMempoolStatus() {
  const totalFee = fastMempool.reduce((s, t) => s + t.fee + t.priorityFee, 0);
  return {
    pendingCount:      fastMempool.length,
    rejectedCount:     rejectedPool.length,
    avgPriorityScore:  fastMempool.length
      ? fastMempool.reduce((s, t) => s + t.priorityScore, 0) / fastMempool.length
      : 0,
    totalFeeInMempool: parseFloat(totalFee.toFixed(8)),
    totalFeeCollected: parseFloat(_totalFeeCollected.toFixed(8)),
    maxMempoolSize:    MAX_MEMPOOL_SIZE,
  };
}

// ── DRAIN COLLECTED FEES — Untuk transfer ke rewardPool ──────
export function drainCollectedFees(): number {
  const amount       = _totalFeeCollected;
  _totalFeeCollected = 0;
  return amount;
}

// ── GET RECENT REJECTED ───────────────────────────────────────
export function getRecentRejected(limit = 20): FastTx[] {
  return rejectedPool.slice(-limit).reverse();
}

// ── GET FAST MEMPOOL ──────────────────────────────────────────
export function getFastMempool(): FastTx[] {
  return [...fastMempool];
}

// ── SIMULATE AI TX — AI internal transaction (fee ke pool) ───
export function simulateAIInternalTx(params: {
  fromAiId: string;
  toAiId:   string;
  amount:   number;
  type:     "trade" | "service" | "fee";
}): { fee: number; netAmount: number } {
  const feeRate  = params.type === "trade" ? 0.005 : params.type === "service" ? 0.01 : 0.002;
  const fee      = parseFloat((params.amount * feeRate).toFixed(8));
  const netAmount = parseFloat((params.amount - fee).toFixed(8));
  _totalFeeCollected += fee;
  return { fee, netAmount };
}
