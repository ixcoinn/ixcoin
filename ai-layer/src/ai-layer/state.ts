// ============================================================
  // STATE.TS — Singleton State Management
  // Menginisialisasi dan menjalankan loop otomatis
  // ============================================================

  import { initDistributedSecurity, updateSecurityFromPopulation } from "./distributed_security.js";
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
      initDistributedSecurity(100, 1);
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
