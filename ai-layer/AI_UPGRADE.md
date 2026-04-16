# AUTONOMOUS DIGITAL CIVILIZATION — Upgrade Documentation

## Versi Upgrade
- **Base**: IXCoin AI Layer (Original)
- **Upgrade**: Autonomous Digital Civilization System
- **Rule**: ZERO kode dihapus — semua perubahan adalah append/extend

---

## File yang Diextend (Kode Lama + Baru)

### `src/ai-layer/types.ts` ← **EXTENDED**
**Ditambahkan:**
- `AIGoal` enum: `SURVIVE | EARN | EXPAND | DOMINATE`
- `NeedsSystem`: `{ energy, wealth, hunger }`
- `AIActionType`: `SEARCH_ENERGY | EARN_WEALTH | EXPLORE | COMPETE | REST_AND_HEAL | TRADE_RESOURCE | RECRUIT_ALLY | BETRAY_ENEMY`
- `AIAction`, `BlockchainTx`, `BlockchainBlock`, `GlobalResourcePool`, `CompetitionResult`, `CivilizationMetrics`

### `src/ai-layer/economy.ts` ← **EXTENDED**
**Ditambahkan:**
- `rewardAI(agent, amount, market)` — reward dari aktivitas
- `consumeEnergy(agent, amount)` — kurangi energy per aksi
- `checkDeath(agent): boolean` — cek kematian energy=0
- `updateNeeds(agent)` — sync needs system per tick
- `earnFromBlockchain(agent, txAmount, market)` — blockchain reward

### `src/ai-layer/world.ts` ← **EXTENDED**
**Ditambahkan:**
- `GlobalResourcePool` singleton (`globalResources`)
- `consumeResource(amount): boolean` — AI ambil resource
- `replenishResources()` — resource tumbuh kembali
- `isResourceScarce(): boolean` — trigger kompetisi
- `tickGlobalResources(world, agents)` — dipanggil tiap siklus

### `src/ai-layer/factory.ts` ← **EXTENDED**
**Ditambahkan:**
- `spawnAI(overrides?)` — lahirkan AI baru dengan stats default
- `rebirthAI(deadAgent)` — kelahiran kembali dari AI mati
- `populateWorld(agents, minPop, cycle)` — isi dunia jika terlalu sedikit

### `src/ai-layer/engine.ts` ← **EXTENDED**
**Ditambahkan:**
- `decideAction(agent, world, nearbyAgents): AIActionType` — wrapper resmi
- `getFormalGoal(agent): AIGoal` — konversi PrimaryGoal → AIGoal enum
- `evaluateNeeds(agent)` — ukur urgensi kebutuhan AI

### `src/ai-layer/loop.ts` ← **EXTENDED**
**Ditambahkan:**
- `executeAction(agent, actionType, state)` — jalankan aksi formal
- `runEnhancedCycle(state)` — siklus dengan: needs update, death check, rebirth, resource tick

### `src/ai-layer/civilization.ts` ← **EXTENDED**
**Ditambahkan:**
- `getCivilizationMetrics(state): CivilizationMetrics`
- `updateCivilizationGrowth(state)`
- `trackResourceUsage(state, amount)`
- `getCivilizationSummary(state): string`

### `src/ai-layer/state.ts` ← **EXTENDED**
**Ditambahkan:**
- `startEnhancedCivilization(agentCount)` — start dengan enhanced loop
- `getLiveSummary(): string` — ringkasan real-time

---

## File Baru (New Modules)

### `src/ai-layer/needs.ts` ← **NEW**
Sistem kebutuhan dasar:
- `createNeeds(agent)` — inisialisasi
- `tickNeeds(agent)` — update tiap loop
- `satisfyHunger(agent, amount)` — makan
- `getNeedsSummary(agent)` — status: dying/critical/hungry/stable/thriving
- `needsDrivenPriority(agent)` — paksa AI pilih aksi berdasarkan needs

### `src/ai-layer/actions.ts` ← **NEW**
Sistem aksi penuh dengan dampak ekonomi:
- `actionSearchEnergy(agent, world)` — cari energy dari resource
- `actionEarnWealth(agent, market)` — hasilkan kekayaan
- `actionExplore(agent, world, market)` — jelajahi dunia
- `actionCompete(agent, rivals, market, cycle)` — kompetisi AI vs AI
- `executeAIAction(agent, actionType, state)` — main dispatcher

### `src/ai-layer/blockchain.ts` ← **NEW**
Event-driven AI dari blockchain:
- `onNewTransaction(tx, state)` — AI bereaksi saat ada TX
- `onNewBlock(block, state)` — AI bereaksi saat block baru
- `registerWalletToAgent(agentId, walletAddress, state)` — hubungkan wallet ke AI
- `triggerCivilizationFromTxList(txList, state)` — batch trigger

### `src/ai-layer/index.ts` ← **NEW**
Unified export semua sistem.

---

## Loop Siklus (Urutan Tiap 800ms)

```
runEnhancedCycle(state):
  1. tickGlobalResources()      ← resource dunia update
  2. updateNeeds(semua AI)      ← hunger/energy/wealth sync
  3. checkDeath(semua AI)       ← AI mati jika energy=0
  4. rebirthAI(AI mati)         ← lahirkan kembali jika resource cukup
  5. populateWorld()            ← pastikan minimal 20 AI
  6. runCycle() [ORIGINAL]      ← proses semua keputusan & interaksi
     ├── processAgentTurn()
     ├── liveDecide()
     ├── executeAction()
     ├── interact() / trade()
     ├── processEvolution()
     ├── updateWorldState()
     └── updateMarketPrice()
```

---

## Cara Pakai

```typescript
import { startEnhancedCivilization, getCivilizationState } from "./ai-layer/state.js";
import { onNewTransaction, onNewBlock } from "./ai-layer/blockchain.js";
import { getCivilizationMetrics } from "./ai-layer/civilization.js";

// Start enhanced civilization
const state = startEnhancedCivilization(100);

// Saat ada transaksi blockchain
onNewTransaction({ txHash: "0x...", from: "addr1", to: "addr2", amount: 500, blockHeight: 100, timestamp: Date.now() }, state);

// Saat block baru
onNewBlock({ blockHash: "0x...", blockHeight: 101, txCount: 25, timestamp: Date.now() }, state);

// Ambil metrics
const metrics = getCivilizationMetrics(state);
console.log(metrics);
```
