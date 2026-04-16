// ============================================================
// BLOCKCHAIN.TS — Event-Driven AI Reactions (NEW FILE)
// AI bereaksi terhadap: transaksi, block baru
// Terhubung ke: ai_core.ts (original), civilization.ts, economy.ts
// ============================================================

import type {
  AIAgent, CivilizationState, BlockchainTx, BlockchainBlock,
  CivilizationEvent, NeedsSystem,
} from "./types.js";
import { earnFromBlockchain, rewardAI } from "./economy.js";
import { consumeResource, tickGlobalResources } from "./world.js";
import { spawnAI } from "./factory.js";
import { logger } from "../lib/logger.js";

function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }
function eid() { return `evt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

// ── ON NEW TRANSACTION — AI bereaksi saat ada transaksi baru ─
export function onNewTransaction(
  tx: BlockchainTx,
  state: CivilizationState,
): CivilizationEvent[] {
  const events: CivilizationEvent[] = [];
  const agents  = Array.from(state.agents.values()).filter(a => a.isAlive);
  if (agents.length === 0) return events;

  logger.info({ txHash: tx.txHash, amount: tx.amount }, "Blockchain TX detected — AI civilization reacting");

  // 1. Resource injection dari transaksi besar
  const resourceBonus = Math.sqrt(tx.amount) * 0.5;
  if (resourceBonus > 0) {
    state.world.resourceLevel = clamp(state.world.resourceLevel + resourceBonus * 0.1, 5, 100);
  }

  // 2. Semua AI mendapat energy boost proporsional
  let activated = 0;
  for (const agent of agents) {
    const earned = earnFromBlockchain(agent, tx.amount, state.market);
    if (earned > 0.1) activated++;

    // Goal shift: AI kaya → EARN mode
    if (agent.wealth > 100 && agent.goals.primaryGoal === "survive") {
      agent.goals.primaryGoal = "grow";
    }
    // AI miskin → aktifkan mode survive + cari energy
    if (agent.energy < agent.maxEnergy * 0.3) {
      agent.goals.primaryGoal = "survive";
    }
  }

  // 3. Spawn AI baru jika transaksi sangat besar (ecosystem growth)
  if (tx.amount > 1000 && agents.length < 120) {
    const fresh = spawnAI({ goals: { primaryGoal: "grow", secondaryGoals: [`spawned_by_tx:${tx.txHash.slice(0, 8)}`], priorityLevel: 5 } });
    state.agents.set(fresh.id, fresh);
    state.stats.alivePopulation++;
    state.world.birthCount++;
    events.push({ id: eid(), type: "birth", actorId: fresh.id, description: `${fresh.name} born from large TX (${tx.amount} IXC)`, timestamp: Date.now(), cycle: state.world.cycle });
  }

  // 4. AI dengan wallet match mendapat reward khusus
  const fromAgents = agents.filter(a => {
    const ext = a as AIAgent & { walletAddress?: string };
    return ext.walletAddress && (ext.walletAddress === tx.from || ext.walletAddress === tx.to);
  });
  for (const fa of fromAgents) {
    rewardAI(fa, tx.amount * 0.001, state.market);
    fa.goals.priorityLevel = Math.min(10, fa.goals.priorityLevel + 1);
  }

  // 5. Log event
  events.push({ id: eid(), type: "trade", description: `TX detected: ${tx.txHash.slice(0, 10)}... (${tx.amount} IXC) → ${activated} AIs reacted`, timestamp: Date.now(), cycle: state.world.cycle });

  // 6. Push ke state event log
  state.eventLog.push(...events);

  return events;
}

// ── ON NEW BLOCK — Setiap block baru mempengaruhi dunia ───────
export function onNewBlock(
  block: BlockchainBlock,
  state: CivilizationState,
): CivilizationEvent[] {
  const events: CivilizationEvent[] = [];
  const agents = Array.from(state.agents.values()).filter(a => a.isAlive);

  logger.info({ blockHeight: block.blockHeight, txCount: block.txCount }, "New block — civilzation tick triggered");

  // 1. Resource replenishment tiap block
  tickGlobalResources(state.world, agents);

  // 2. Lebih banyak TX = lebih aktif AI
  const activityBoost = Math.min(block.txCount * 0.2, 15);
  state.world.activityLevel = clamp(state.world.activityLevel + activityBoost, 0, 100);

  // 3. Elite & Leader AI mendapat block reward
  const elites = agents.filter(a => a.rank === "elite" || a.rank === "leader");
  for (const elite of elites) {
    const blockReward = (elite.rank === "leader" ? 3 : 2) * (1 + block.txCount * 0.01);
    rewardAI(elite, blockReward, state.market);
  }

  // 4. Log event
  events.push({ id: eid(), type: "trade", description: `Block #${block.blockHeight} mined (${block.txCount} TXs) — world resources +${activityBoost.toFixed(1)} activity`, timestamp: Date.now(), cycle: state.world.cycle });

  state.eventLog.push(...events);
  return events;
}

// ── REGISTER WALLET TO AI — Hubungkan wallet ke AI agent ─────
export function registerWalletToAgent(
  agentId: string,
  walletAddress: string,
  state: CivilizationState,
): boolean {
  const agent = state.agents.get(agentId) as (AIAgent & { walletAddress?: string }) | undefined;
  if (!agent) return false;
  agent.walletAddress = walletAddress;
  agent.goals.priorityLevel = Math.min(10, agent.goals.priorityLevel + 2);
  logger.info({ agentId, walletAddress }, "Wallet registered to AI agent");
  return true;
}

// ── TRIGGER CIVILIZATION FROM TX LIST — Batch trigger ────────
export function triggerCivilizationFromTxList(
  txList: BlockchainTx[],
  state: CivilizationState,
): { totalEvents: number; agentsAffected: number } {
  let totalEvents = 0;
  const affected = new Set<string>();

  for (const tx of txList) {
    const evts = onNewTransaction(tx, state);
    totalEvents += evts.length;
    // Track agents yang terpengaruh
    for (const e of evts) {
      if (e.actorId) affected.add(e.actorId);
      if (e.targetId) affected.add(e.targetId);
    }
  }

  return { totalEvents, agentsAffected: affected.size };
}
