// ============================================================
// LOCAL_STATE.TS — Per-Node Local State (NO shared/global DB)
// Setiap node menyimpan state sendiri di file lokal
// Sync via P2P — bukan DB terpusat
// ============================================================

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { NodeLocalState, ContributionRecord } from "./types.js";

const STATE_DIR = process.env["NODE_STATE_DIR"] ?? "./node_state";
const NODE_ID = process.env["NODE_ID"] ?? ("node_" + Math.random().toString(36).slice(2, 9));

function ensureDir(): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
}

function statePath(): string {
  return join(STATE_DIR, `${NODE_ID}_state.json`);
}

// State in-memory — di-persist ke disk
let _state: NodeLocalState = {
  nodeId: NODE_ID,
  ai_memory: {},
  ai_state: {},
  contribution_history: [],
  reputation: 50,
  lastSyncAt: Date.now(),
};

export function loadLocalState(): NodeLocalState {
  try {
    ensureDir();
    const p = statePath();
    if (existsSync(p)) {
      _state = JSON.parse(readFileSync(p, "utf8")) as NodeLocalState;
    }
  } catch { /* mulai fresh jika korup */ }
  return _state;
}

export function saveLocalState(): void {
  try {
    ensureDir();
    _state.lastSyncAt = Date.now();
    writeFileSync(statePath(), JSON.stringify(_state, null, 2), "utf8");
  } catch { /* ignore write error */ }
}

export function getLocalState(): NodeLocalState { return _state; }

export function updateAIMemory(key: string, value: unknown): void {
  _state.ai_memory[key] = value;
  saveLocalState();
}

export function updateAIState(key: string, value: unknown): void {
  _state.ai_state[key] = value;
  saveLocalState();
}

export function addContribution(record: ContributionRecord): void {
  _state.contribution_history.push(record);
  // Limit ke 1000 record, pruning otomatis
  if (_state.contribution_history.length > 1000) {
    _state.contribution_history = _state.contribution_history.slice(-500);
  }
  saveLocalState();
}

export function updateLocalReputation(delta: number): void {
  _state.reputation = Math.max(0, Math.min(100, _state.reputation + delta));
  saveLocalState();
}

export function getContributionScore(): number {
  const recent = _state.contribution_history.slice(-100);
  if (recent.length === 0) return 0;
  return recent.reduce((sum, r) => sum + r.score, 0) / recent.length;
}

export function getStateSnapshot(): Record<string, unknown> {
  return {
    nodeId: _state.nodeId,
    reputation: _state.reputation,
    contributionScore: getContributionScore(),
    totalContributions: _state.contribution_history.length,
    memoryKeys: Object.keys(_state.ai_memory).length,
    lastSyncAt: _state.lastSyncAt,
  };
}
