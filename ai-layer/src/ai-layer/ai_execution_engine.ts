// ============================================================
// AI_EXECUTION_ENGINE.TS — AI Execution Layer
// [FIX] AI hanya melakukan PRE-SCREENING dan PRIORITAS.
//       AI_APPROVED bukan status final — hanya menandai bahwa
//       transaksi LAYAK DIPROSES oleh PoW miner.
//
// ATURAN FINAL (tidak bisa diubah):
//   1. AI boleh: approve/reject berdasarkan aturan dasar, menghitung priorityScore
//   2. AI TIDAK boleh: mengubah jumlah tx, mengkonfirmasi final, mengubah balance
//   3. Status FINAL hanya: POW_CONFIRMED (oleh miner) atau EXPIRED (timeout)
//   4. Transaksi yang tidak dikonfirmasi PoW dalam TX_EXPIRY_MS akan HANGUS
// ============================================================

export type TxStatus =
  | "PENDING"         // baru masuk, belum divalidasi AI
  | "AI_SCREENED"     // [FIX] renamed dari AI_APPROVED — bukan final, hanya lolos screening
  | "AI_REJECTED"     // ditolak AI (tidak memenuhi syarat dasar)
  | "POW_CONFIRMED"   // [FIX] SATU-SATUNYA status final — dikonfirmasi PoW miner
  | "EXPIRED"         // [FIX] tidak dikonfirmasi PoW dalam batas waktu → hangus
  | "REJECTED";       // ditolak final (oleh PoW atau sistem)

// [DEPRECATED] AI_APPROVED digantikan AI_SCREENED
// Alias untuk backward compatibility — jangan digunakan di kode baru
export const AI_APPROVED_DEPRECATED = "AI_SCREENED" as const;

export interface FastTx {
  id:              string;
  from:            string;
  to:              string;
  amount:          number;
  fee:             number;
  priorityFee:     number;
  priorityScore:   number;
  status:          TxStatus;
  aiScreenedById:  string | null;  // [FIX] renamed dari aiValidatorId
  aiScreenedAt:    number | null;  // [FIX] renamed dari aiDecisionAt
  submittedAt:     number;
  expiresAt:       number;         // [FIX] transaksi HANGUS setelah waktu ini jika tidak PoW-confirmed
  memo?:           string;
}

export interface TxValidationResult {
  txId:          string;
  approved:      boolean;
  reason:        string;
  priorityScore: number;
  note:          string;  // [FIX] selalu berisi peringatan bahwa ini bukan final
}

// ── IN-MEMORY SCREENING QUEUE — Hanya untuk antrian ke miner ─
// [FIX] fastMempool BUKAN state final.
//       Ini adalah antrian sementara menunggu PoW konfirmasi.
//       Jika tidak dikonfirmasi dalam TX_EXPIRY_MS → status EXPIRED.
const fastMempool:  FastTx[] = [];
const rejectedPool: FastTx[] = [];
let   _totalFeeCollected = 0;

const MIN_TX_AMOUNT    = 0.001;
const MIN_FEE          = 0.0001;
const MAX_MEMPOOL_SIZE = 1000;
const TX_EXPIRY_MS     = 10 * 60 * 1000;  // [FIX] 10 menit — setelah ini tx EXPIRED jika tidak PoW-confirmed

// ── SUBMIT TRANSACTION — User kirim transaksi ke AI layer ────
export function submitTransaction(params: {
  from:         string;
  to:           string;
  amount:       number;
  fee:          number;
  priorityFee?: number;
  memo?:        string;
}): FastTx {
  const now = Date.now();
  const tx: FastTx = {
    id:              `tx_${now}_${Math.random().toString(36).slice(2, 8)}`,
    from:            params.from,
    to:              params.to,
    amount:          params.amount,
    fee:             params.fee,
    priorityFee:     params.priorityFee ?? 0,
    priorityScore:   0,
    status:          "PENDING",
    aiScreenedById:  null,
    aiScreenedAt:    null,
    submittedAt:     now,
    expiresAt:       now + TX_EXPIRY_MS,  // [FIX] set expiry saat submit
    memo:            params.memo,
  };
  return tx;
}

// ── AI SCREEN TX — AI PRE-SCREENING (bukan konfirmasi final) ──
// [FIX] Fungsi ini hanya melakukan:
//   - Cek syarat dasar (amount, fee, self-transfer, mempool capacity)
//   - Hitung priorityScore untuk ordering di mempool
//   - Set status AI_SCREENED (BUKAN final — hanya lolos filter awal)
// AI TIDAK boleh:
//   - Mengubah tx.amount atau tx.fee
//   - Mengkonfirmasi transaksi sebagai final
//   - Mengubah balance siapapun
export function aiValidateTx(tx: FastTx, validatorAiId: string): TxValidationResult {
  const REJECT_NOTE = "AI screening rejected. No balance change. No state mutation.";
  const APPROVE_NOTE =
    "AI_SCREENED — BUKAN FINAL. Tx masuk antrian PoW. " +
    "Balance HANYA berubah setelah POW_CONFIRMED oleh miner.";

  // Cek syarat dasar — jika gagal, tolak (tidak masuk antrian)
  if (tx.amount < MIN_TX_AMOUNT) {
    tx.status         = "AI_REJECTED";
    tx.aiScreenedAt   = Date.now();
    tx.aiScreenedById = validatorAiId;
    rejectedPool.push(tx);
    return { txId: tx.id, approved: false, reason: `Amount ${tx.amount} below minimum ${MIN_TX_AMOUNT}`, priorityScore: 0, note: REJECT_NOTE };
  }

  if (tx.fee < MIN_FEE) {
    tx.status         = "AI_REJECTED";
    tx.aiScreenedAt   = Date.now();
    tx.aiScreenedById = validatorAiId;
    rejectedPool.push(tx);
    return { txId: tx.id, approved: false, reason: `Fee ${tx.fee} below minimum ${MIN_FEE}`, priorityScore: 0, note: REJECT_NOTE };
  }

  if (tx.from === tx.to) {
    tx.status         = "AI_REJECTED";
    tx.aiScreenedAt   = Date.now();
    tx.aiScreenedById = validatorAiId;
    rejectedPool.push(tx);
    return { txId: tx.id, approved: false, reason: "Self-transfer not allowed", priorityScore: 0, note: REJECT_NOTE };
  }

  // Bersihkan tx yang expired sebelum cek kapasitas
  expireUnconfirmedTxs();

  if (fastMempool.length >= MAX_MEMPOOL_SIZE) {
    tx.status         = "AI_REJECTED";
    tx.aiScreenedAt   = Date.now();
    tx.aiScreenedById = validatorAiId;
    rejectedPool.push(tx);
    return { txId: tx.id, approved: false, reason: "Mempool full", priorityScore: 0, note: REJECT_NOTE };
  }

  // Hitung priorityScore — AI HANYA boleh mengubah ini, bukan amount/fee
  const feeRatio     = (tx.fee + tx.priorityFee) / tx.amount;
  const priorityScore = Math.min(100, feeRatio * 1000 + tx.priorityFee * 100);

  // [FIX] Status AI_SCREENED — bukan final, hanya lolos filter awal
  tx.status         = "AI_SCREENED";
  tx.priorityScore  = parseFloat(priorityScore.toFixed(4));
  tx.aiScreenedAt   = Date.now();
  tx.aiScreenedById = validatorAiId;

  // Fee dikumpulkan ke reward pool (hanya dicatat — belum final)
  _totalFeeCollected += tx.fee + tx.priorityFee;

  // Masuk antrian screening, sorted by priorityScore
  fastMempool.push(tx);
  fastMempool.sort((a, b) => b.priorityScore - a.priorityScore);
  if (fastMempool.length > MAX_MEMPOOL_SIZE) fastMempool.splice(MAX_MEMPOOL_SIZE);

  return {
    txId:          tx.id,
    approved:      true,
    reason:        "AI_SCREENED — awaiting PoW confirmation",
    priorityScore,
    note:          APPROVE_NOTE,
  };
}

// ── EXPIRE UNCONFIRMED — Hanguskan tx yang tidak dikonfirmasi PoW ─
// [FIX] Transaksi yang tidak mendapat POW_CONFIRMED dalam TX_EXPIRY_MS
//       secara otomatis menjadi EXPIRED — tidak ada efek ke balance.
export function expireUnconfirmedTxs(): number {
  const now     = Date.now();
  let   expired = 0;
  for (const tx of fastMempool) {
    if (tx.status === "AI_SCREENED" && now > tx.expiresAt) {
      tx.status = "EXPIRED";
      expired++;
    }
  }
  // Bersihkan expired dari mempool aktif
  const before = fastMempool.length;
  fastMempool.splice(0, fastMempool.length, ...fastMempool.filter(t => t.status === "AI_SCREENED"));
  return expired;
}

// ── SELECT FOR MINING — Miner ambil tx dari antrian screening ─
// [FIX] Hanya tx berstatus AI_SCREENED yang diberikan ke miner.
//       Miner kemudian menjalankan PoW dan memanggil confirmByPoW().
export function selectForMining(maxTx = 500): FastTx[] {
  expireUnconfirmedTxs(); // bersihkan expired sebelum pilih
  return fastMempool.filter(t => t.status === "AI_SCREENED").slice(0, maxTx);
}

// ── CONFIRM BY POW — SATU-SATUNYA cara tx menjadi final ───────
// [FIX] Fungsi ini HARUS dipanggil oleh PoW miner setelah block dikonfirmasi.
//       Hanya setelah ini balance boleh berubah (di lapisan blockchain).
//       ai_execution_engine sendiri tidak mengubah balance — itu tugas blockchain.
export function confirmByPoW(txIds: string[]): number {
  let confirmed = 0;
  for (const id of txIds) {
    const idx = fastMempool.findIndex(t => t.id === id && t.status === "AI_SCREENED");
    if (idx !== -1) {
      fastMempool[idx].status = "POW_CONFIRMED";
      // [FIX] Hapus dari antrian setelah konfirmasi — state final ada di blockchain
      fastMempool.splice(idx, 1);
      confirmed++;
    }
  }
  return confirmed;
}

// ── GET MEMPOOL STATUS ────────────────────────────────────────
export function getMempoolStatus() {
  expireUnconfirmedTxs();
  const activeTxs  = fastMempool.filter(t => t.status === "AI_SCREENED");
  const totalFee   = activeTxs.reduce((s, t) => s + t.fee + t.priorityFee, 0);
  return {
    screenedCount:     activeTxs.length,   // [FIX] bukan "pendingCount" — ini belum final
    rejectedCount:     rejectedPool.length,
    avgPriorityScore:  activeTxs.length
      ? activeTxs.reduce((s, t) => s + t.priorityScore, 0) / activeTxs.length
      : 0,
    totalFeeInQueue:   parseFloat(totalFee.toFixed(8)),
    totalFeeCollected: parseFloat(_totalFeeCollected.toFixed(8)),
    maxMempoolSize:    MAX_MEMPOOL_SIZE,
    note:              "screenedCount = menunggu PoW, BUKAN transaksi yang sudah terkonfirmasi",
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

// ── SIMULATE AI INTERNAL TX — Fee ke pool ────────────────────
export function simulateAIInternalTx(params: {
  fromAiId: string;
  toAiId:   string;
  amount:   number;
  type:     "trade" | "service" | "fee";
}): { fee: number; netAmount: number } {
  const feeRate   = params.type === "trade" ? 0.005 : params.type === "service" ? 0.01 : 0.002;
  const fee       = parseFloat((params.amount * feeRate).toFixed(8));
  const netAmount = parseFloat((params.amount - fee).toFixed(8));
  _totalFeeCollected += fee;
  return { fee, netAmount };
}
