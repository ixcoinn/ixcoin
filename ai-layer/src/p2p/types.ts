// ============================================================
// P2P/TYPES.TS — Shared type definitions for P2P Layer
// UPGRADE: Added priority, expiresAt, weight, reputation,
//          local state types, new message types
// ============================================================

export type NodeType = "BASIC_NODE" | "AI_NODE" | "VALIDATOR_NODE";

export interface PeerInfo {
  nodeId: string;
  address: string;
  port: number;
  nodeType: NodeType;
  connectedAt: number;
  lastSeen: number;
  reputation?: number;  // [NEW] 0-100 reputation score
}

export interface P2PMessage {
  type: P2PMessageType;
  from: string;
  to?: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export type P2PMessageType =
  | "HELLO"
  | "HELLO_ACK"
  | "PEER_LIST"
  | "PEER_DISCOVERY"        // [NEW] aktif cari peer baru
  | "TASK_BROADCAST"
  | "TASK_ACCEPT"
  | "TASK_RESULT"
  | "TASK_VALIDATE"
  | "VALIDATION_VOTE"
  | "CONSENSUS_RESULT"
  | "HEARTBEAT"
  | "STATE_SYNC"            // [NEW] sinkronisasi state antar node
  | "REPUTATION_UPDATE"     // [NEW] update reputasi node
  | "CONTRIBUTION_UPDATE"   // [NEW] update kontribusi node
  | "BLOCKCHAIN_RESULT"     // [NEW] hasil final ke blockchain
  | "GOODBYE";

export interface AITask {
  taskId: string;
  type: "TX_VALIDATE" | "AI_INFERENCE" | "CONSENSUS" | "MEMPOOL_SCAN" | "GENERATE" | "PROCESS";
  payload: Record<string, unknown>;
  priority: number;         // [NEW] 1-10, makin tinggi makin urgent
  createdBy: string;
  createdAt: number;
  expiresAt: number;        // [NEW] task hangus jika tidak diambil
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CONSENSUS_OK" | "CONSENSUS_FAIL";
  result?: Record<string, unknown>;
  assignedTo?: string;
  votes?: ValidationVote[];
}

export interface ValidationVote {
  validatorId: string;
  approved: boolean;
  confidence: number;
  weight: number;           // [NEW] bobot berdasarkan reputasi
  timestamp: number;
}

export interface P2PNetworkState {
  nodeId: string;
  nodeType: NodeType;
  p2pPort: number;
  peers: Map<string, PeerInfo>;
  isRunning: boolean;
}

// ── [NEW] LOCAL STATE PER NODE ────────────────────────────────
export interface NodeLocalState {
  nodeId: string;
  ai_memory: Record<string, unknown>;
  ai_state: Record<string, unknown>;
  contribution_history: ContributionRecord[];
  reputation: number;
  lastSyncAt: number;
}

export interface ContributionRecord {
  timestamp: number;
  type: "task_completed" | "task_validated" | "consensus_participated" | "peer_helped";
  taskId?: string;
  score: number;
}
