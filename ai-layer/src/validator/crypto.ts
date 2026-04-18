// ============================================================
// CRYPTO.TS — Deterministic Hash & Merkle Root Utilities
// Used by Simulation Witness Layer for cryptographic proofs
// ============================================================

import { createHash, createHmac } from "crypto";

// ── SHA-256 HASH ──────────────────────────────────────────────
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// ── HMAC-SHA256 — for validator signatures ───────────────────
export function hmacSha256(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data, "utf8").digest("hex");
}

// ── DETERMINISTIC STRINGIFY — stable JSON for hashing ────────
export function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== "object") return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }

  const sorted = Object.keys(obj as Record<string, unknown>)
    .sort()
    .map((k) => JSON.stringify(k) + ":" + stableStringify((obj as Record<string, unknown>)[k]))
    .join(",");
  return "{" + sorted + "}";
}

// ── MERKLE LEAF — hash a single item deterministically ───────
export function merkleLeaf(item: unknown): string {
  return sha256(stableStringify(item));
}

// ── MERKLE ROOT — binary tree hash of leaves ─────────────────
export function computeMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return sha256("empty");
  if (leaves.length === 1) return leaves[0]!;

  let layer = [...leaves];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i]!;
      const right = i + 1 < layer.length ? layer[i + 1]! : left;
      next.push(sha256(left + right));
    }
    layer = next;
  }
  return layer[0]!;
}

// ── AGENT STATE ROOT HASH ─────────────────────────────────────
// Deterministic hash of all agent states → state_root_hash
export function computeStateRootHash(agents: unknown[]): string {
  if (agents.length === 0) return sha256("empty_agents");

  // Sort agents by id for deterministic ordering
  const sorted = [...agents].sort((a, b) => {
    const idA = (a as { id?: string }).id ?? "";
    const idB = (b as { id?: string }).id ?? "";
    return idA.localeCompare(idB);
  });

  const leaves = sorted.map((agent) => merkleLeaf(agent));
  return computeMerkleRoot(leaves);
}

// ── EVENT MERKLE ROOT ─────────────────────────────────────────
export function computeEventMerkleRoot(events: unknown[]): string {
  if (events.length === 0) return sha256("empty_events");

  const leaves = events.map((event) => merkleLeaf(event));
  return computeMerkleRoot(leaves);
}

// ── WORLD STATE HASH ──────────────────────────────────────────
export function computeWorldStateHash(worldState: unknown): string {
  return sha256(stableStringify(worldState));
}

// ── SIMULATION PROOF — combined deterministic proof ──────────
export function computeSimulationProof(
  stateRootHash: string,
  eventMerkleRoot: string,
  worldStateHash: string,
  cycle: number,
  timestamp: number,
  deterministicSeed: string,
): string {
  const proofInput = stableStringify({
    stateRootHash,
    eventMerkleRoot,
    worldStateHash,
    cycle,
    timestamp,
    deterministicSeed,
  });
  return sha256(proofInput);
}

// ── DETERMINISTIC SEED — for simulation replay ───────────────
export function computeDeterministicSeed(
  cycle: number,
  agentCount: number,
  stateRootHash: string,
): string {
  return sha256(`seed:cycle=${cycle}:agents=${agentCount}:state=${stateRootHash}`);
}

// ── VALIDATOR SIGNATURE — signs a report ─────────────────────
export function signReport(reportContent: string, validatorId: string, stake: number): string {
  const secret = `${validatorId}:${stake}:ixc_validator_secret`;
  return hmacSha256(reportContent, secret);
}

// ── REPORT HASH — SHA-256 of entire report ───────────────────
export function computeReportHash(report: unknown): string {
  return sha256(stableStringify(report));
}
