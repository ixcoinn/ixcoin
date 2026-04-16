# IXCoin AI Layer — Full System Upgrade

## Summary

Complete upgrade dari AI Layer IXCoin: mengganti sistem reward lama (berbasis transaksi) dengan sistem baru berbasis **AI Score**, menambahkan **AI Validator Network**, **AI Execution Layer** (fast mempool), dan **Ekonomi Berkelanjutan** 3 fase.

---

## File Baru yang Ditambahkan

### `src/ai-layer/`
| File | Fungsi |
|------|--------|
| `ai_score.ts` | Formula AI Score: `score = activity×0.4 + interaction×0.2 + economy×0.2 + evolution×0.2`. Decay tiap siklus. |
| `validator.ts` | Struct Validator, voting system, weighted score. `validatorWeight = stake × reputation` |
| `validation_engine.ts` | Orchestrasi validasi: `finalScore = ai.score × ai.validationScore`. Batch validation. |
| `ai_execution_engine.ts` | Fast mempool. AI validasi tx sebelum masuk PoW miner. `tx.status = AI_APPROVED`. |
| `ai_validator.ts` | AI instance sebagai validator. Auto-register jika memenuhi syarat stake & score. |

### `src/ecosystem/`
| File | Fungsi |
|------|--------|
| `sustainable_economy.ts` | 3-fase ekonomi: FASE_1 (pool), FASE_2 (campuran), FASE_3 (100% fee). |
| `reward_distributor.ts` | Distribusi reward berbasis AI Score. Living cost per AI. Fee collection. |

---

## File yang Dimodifikasi

### `src/activity/transaction_monitor.ts`
- **HAPUS**: `dispatchPoolReward()` — reward langsung dari tx (DIHAPUS PERMANEN)
- **HAPUS**: import `distributeReward`, `calcActivityScore`
- **TAMBAH**: `collectBlockFees()` — fee tx dikumpulkan ke reward pool
- TX detection sekarang hanya: (1) notifikasi AI, (2) kumpul fee

### `src/ai-layer/loop.ts`
- **TAMBAH**: `stepUpdateMetrics()` — update AI Score metrics tiap siklus
- **TAMBAH**: `stepApplyLivingCost()` — potong biaya hidup dari balance AI
- **TAMBAH**: `stepAIInternalEconomy()` — transaksi antar AI, fee ke pool
- **TAMBAH**: `runFullAIScoreCycle()` — siklus master yang memanggil semua step
- **TAMBAH**: `startAIScoreLoop()` — entry point loop utama

### `src/ai-layer/types.ts`
- **TAMBAH**: `AIMetrics` interface
- **TAMBAH**: `AIScoreFields` interface (score, validationScore, finalScore, balance, ownerWallet)
- **TAMBAH**: `FastTxRef`, `EconomyPhase`

---

## Arsitektur Sistem Baru

```
[AI bekerja tiap 800ms]
        ↓
[Decay metrics lama]
        ↓
[Update metrics dari aksi]  activity / interaction / economy / evolution
        ↓
[Hitung AI Score]           score = (a×0.4) + (i×0.2) + (e×0.2) + (v×0.2)
        ↓
[Validator Network]         finalScore = ai.score × validationScore
        ↓
[Distribusi Reward]         rawReward = (finalScore / totalFinalScore) × dailyPool
        ↓
[Cap & Send]                finalReward = min(rawReward, 5 IXC) → ai.ownerWallet
        ↓
[Living Cost]               ai.balance -= baseCost × activity
        ↓
[Jika balance ≤ 0]          ai.status = "inactive"
```

---

## Alur Transaksi (AI Execution Layer)

```
[User kirim tx]
        ↓
[AI Validator cepat]        AI_APPROVED / REJECTED
        ↓
[Fast Mempool]              sorted by priorityScore
        ↓
[PoW Miner pilih tx]        block.transactions = selectFrom(fastMempool)
        ↓
[PoW konfirmasi final]      hanya PoW yang final — AI tidak bypass ini
        ↓
[Fee tx → reward pool]      ingestFee() → sustainable economy
```

---

## Ekonomi 3 Fase

| Fase | Kondisi | Sumber Reward |
|------|---------|---------------|
| PHASE_1 | Pool > 2.5M IXC (>50%) | 100% dari 5M pool |
| PHASE_2 | Pool 250K–2.5M IXC (5%–50%) | 50% pool + 50% fee |
| PHASE_3 | Pool < 250K IXC (<5%) | 100% fee economy |

Sumber fee:
- `tx.fee` dari transaksi on-chain
- `tx.priorityFee` dari fast mempool
- `ai.serviceFee` dari transaksi antar AI internal

---

## Keamanan

- AI **tidak bisa** mengubah jumlah transaksi di blockchain
- AI **tidak bisa** bypass PoW — hanya approve/reject tx di fast mempool
- Validator network mencegah manipulasi score
- Pool supply control ketat: `distributed + remaining = 5,000,000` selalu
- HARD STOP: pool = 0 → sistem otomatis beralih ke fee economy

---

## File yang TIDAK Diubah (tetap utuh)

- `civilization.ts` — Civilization state, group, tribe system
- `world.ts` — World state, resource pool (hanya ditambah)
- `needs.ts` — AI needs system
- `actions.ts` — AI action system
- `interaction.ts` — Interaction, alliance, betrayal
- `evolution.ts` — Mutation & evolution
- `factory.ts` — Agent factory, rebirth
- `economy.ts` — Market dynamics (earnFromBlockchain tetap ada tapi tidak dipanggil dari reward path)
- `pool.ts` — 5M pool supply control (tetap utuh)
