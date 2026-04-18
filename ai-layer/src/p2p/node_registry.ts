// ============================================================
// NODE_REGISTRY.TS — Registry semua node di jaringan P2P
// UPGRADE: Tambah reputation tracking per node
// ============================================================

import type { PeerInfo, NodeType } from "./types.js";

const INACTIVE_THRESHOLD_MS = 5 * 60 * 1000;

class NodeRegistry {
  private nodes = new Map<string, PeerInfo>();

  registerNode(info: PeerInfo): void {
    const existing = this.nodes.get(info.nodeId);
    this.nodes.set(info.nodeId, {
      ...info,
      lastSeen: Date.now(),
      reputation: existing?.reputation ?? info.reputation ?? 50,
    });
  }

  updateLastSeen(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) node.lastSeen = Date.now();
  }

  // [NEW] Update reputasi node berdasarkan performa
  updateReputation(nodeId: string, delta: number): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.reputation = Math.max(0, Math.min(100, (node.reputation ?? 50) + delta));
    }
  }

  // [NEW] Ambil reputasi node
  getReputation(nodeId: string): number {
    return this.nodes.get(nodeId)?.reputation ?? 50;
  }

  removeNode(nodeId: string): void {
    this.nodes.delete(nodeId);
  }

  getNodesByType(type: NodeType): PeerInfo[] {
    return Array.from(this.nodes.values()).filter(n => n.nodeType === type);
  }

  getAllNodes(): PeerInfo[] {
    return Array.from(this.nodes.values());
  }

  getAINodes(): PeerInfo[] { return this.getNodesByType("AI_NODE"); }
  getValidatorNodes(): PeerInfo[] { return this.getNodesByType("VALIDATOR_NODE"); }

  pruneInactive(): void {
    const now = Date.now();
    for (const [id, node] of this.nodes) {
      if (now - node.lastSeen > INACTIVE_THRESHOLD_MS) this.nodes.delete(id);
    }
  }

  getStats() {
    const all = this.getAllNodes();
    return {
      total: all.length,
      basicNodes:     all.filter(n => n.nodeType === "BASIC_NODE").length,
      aiNodes:        all.filter(n => n.nodeType === "AI_NODE").length,
      validatorNodes: all.filter(n => n.nodeType === "VALIDATOR_NODE").length,
    };
  }
}

export const nodeRegistry = new NodeRegistry();
