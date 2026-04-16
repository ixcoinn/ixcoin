// ============================================================
  // STATE.TS — Singleton State Management
  // Menginisialisasi dan menjalankan loop otomatis
  // ============================================================

  import type { CivilizationState } from "./types.js";
  import { createCivilizationState } from "./factory.js";
  import { startLifeLoop } from "./loop.js";
  import { logger } from "../lib/logger.js";

  let civilizationState: CivilizationState | null = null;
  let loopHandle: NodeJS.Timeout | null = null;

  export function getCivilizationState(): CivilizationState {
    if (!civilizationState) {
      logger.info("Initializing Digital Civilization with 100 agents");
      civilizationState = createCivilizationState(100, 800);
      loopHandle = startLifeLoop(civilizationState);
      logger.info({ agentCount: civilizationState.agents.size }, "Life loop started — civilization is ALIVE");
    }
    return civilizationState;
  }

  export function resetCivilization(agentCount = 100): CivilizationState {
    if (loopHandle) { clearInterval(loopHandle); loopHandle = null; }
    civilizationState = createCivilizationState(agentCount, 800);
    loopHandle = startLifeLoop(civilizationState);
    logger.info({ agentCount }, "Civilization reset");
    return civilizationState;
  }

  export function stopCivilization(): void {
    if (loopHandle) { clearInterval(loopHandle); loopHandle = null; }
    if (civilizationState) civilizationState.isRunning = false;
    logger.info("Civilization stopped");
  }
  
// ============================================================
// UPGRADE: STATE — Enhanced lifecycle hooks
// Appended — NO original code removed
// ============================================================

import { runEnhancedCycle } from "./loop.js";
import { initGlobalResources } from "./world.js";
import { getCivilizationSummary } from "./civilization.js";

// ── START WITH ENHANCED LOOP — Pakai siklus lengkap ──────────
export function startEnhancedCivilization(agentCount = 100): CivilizationState {
  if (loopHandle) { clearInterval(loopHandle); loopHandle = null; }

  // Inisialisasi resource global
  initGlobalResources(10000, 15);

  civilizationState = createCivilizationState(agentCount, 800);
  civilizationState.isRunning = true;

  loopHandle = setInterval(async () => {
    if (!civilizationState?.isRunning) return;
    try {
      await runEnhancedCycle(civilizationState!);
    } catch (err) {
      // logger tersedia dari import scope yang sudah ada
      console.error("[CivilizationError]", err);
    }
  }, 800);

  console.info(`[CIVILIZATION] Enhanced life loop started — ${agentCount} AI agents alive`);
  return civilizationState;
}

// ── GET LIVE SUMMARY — Ambil ringkasan real-time ─────────────
export function getLiveSummary(): string {
  if (!civilizationState) return "Civilization not initialized";
  return getCivilizationSummary(civilizationState);
}
