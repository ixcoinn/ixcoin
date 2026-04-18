// ============================================================
// P2P_NETWORK.TS — WebSocket P2P Network Layer
// UPGRADE: Tambah gossip broadcast, reconnect logic, peer discovery
// Murni peer-to-peer — tanpa server pusat / no central server
// ============================================================

import { WebSocket, WebSocketServer } from "ws";
import { logger } from "../lib/logger.js";
import type { P2PMessage, PeerInfo, NodeType, P2PNetworkState } from "./types.js";
import { nodeRegistry } from "./node_registry.js";
import { getStateSnapshot } from "./local_state.js";

export const NODE_ID = process.env["NODE_ID"] ?? ("node_" + Math.random().toString(36).slice(2, 9));
export const NODE_TYPE = (process.env["NODE_TYPE"] ?? "AI_NODE") as NodeType;
const P2P_PORT = parseInt(process.env["P2P_PORT"] ?? "9080", 10);

// [NEW] Reconnect settings
const RECONNECT_DELAY_MS  = 5000;
const MAX_RECONNECT       = 10;

const state: P2PNetworkState = {
  nodeId: NODE_ID,
  nodeType: NODE_TYPE,
  p2pPort: P2P_PORT,
  peers: new Map(),
  isRunning: false,
};

const connections      = new Map<string, WebSocket>();
const reconnectCount   = new Map<string, number>();   // [NEW]
const messageHandlers: Array<(msg: P2PMessage, peerId: string) => void> = [];

let wss: WebSocketServer | null = null;

export function initP2PServer(): void {
  if (state.isRunning) return;
  try {
    wss = new WebSocketServer({ port: P2P_PORT });
    state.isRunning = true;

    wss.on("connection", (ws, req) => {
      const remoteIp = req.socket.remoteAddress ?? "unknown";
      logger.info({ remoteIp }, "[P2P] Incoming connection");

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as P2PMessage;
          handleIncomingMessage(msg, ws);
        } catch { logger.warn("[P2P] Bad message received"); }
      });

      ws.on("close", () => {
        for (const [id, conn] of connections) {
          if (conn === ws) { connections.delete(id); break; }
        }
      });

      ws.on("error", (err) => {
        logger.warn({ err: err.message }, "[P2P] Connection error");
      });
    });

    wss.on("error", (err) => {
      logger.error({ err: err.message }, "[P2P] Server error");
    });

    logger.info({ nodeId: NODE_ID, nodeType: NODE_TYPE, port: P2P_PORT }, "[P2P] Server started");
  } catch (err) {
    logger.warn({ err }, "[P2P] Cannot bind P2P port — running client-only mode");
  }
}

export function connectToPeer(peerAddress: string): void {
  if (connections.has(peerAddress)) return;
  const attempts = reconnectCount.get(peerAddress) ?? 0;
  if (attempts >= MAX_RECONNECT) return;

  try {
    const ws = new WebSocket(peerAddress);

    ws.on("open", () => {
      reconnectCount.set(peerAddress, 0);
      const hello: P2PMessage = {
        type: "HELLO",
        from: NODE_ID,
        payload: { nodeType: NODE_TYPE, p2pPort: P2P_PORT, address: peerAddress },
        timestamp: Date.now(),
      };
      ws.send(JSON.stringify(hello));
      connections.set(peerAddress, ws);
      logger.info({ peerAddress }, "[P2P] Connected to peer");
      // [NEW] setelah connect, bagikan daftar peer kita
      broadcastPeerList();
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as P2PMessage;
        handleIncomingMessage(msg, ws);
      } catch { logger.warn("[P2P] Bad message from peer"); }
    });

    // [NEW] Reconnect otomatis saat disconnect
    ws.on("close", () => {
      connections.delete(peerAddress);
      logger.info({ peerAddress }, "[P2P] Peer disconnected — scheduling reconnect");
      scheduleReconnect(peerAddress);
    });

    ws.on("error", (err) => {
      logger.warn({ peerAddress, err: err.message }, "[P2P] Peer error");
      connections.delete(peerAddress);
      scheduleReconnect(peerAddress);
    });
  } catch { logger.warn({ peerAddress }, "[P2P] Failed to connect"); }
}

// [NEW] Reconnect dengan exponential backoff
function scheduleReconnect(peerAddress: string): void {
  const attempts = (reconnectCount.get(peerAddress) ?? 0) + 1;
  reconnectCount.set(peerAddress, attempts);
  if (attempts >= MAX_RECONNECT) {
    logger.warn({ peerAddress, attempts }, "[P2P] Max reconnect reached");
    return;
  }
  const delay = RECONNECT_DELAY_MS * Math.min(attempts, 5);
  setTimeout(() => connectToPeer(peerAddress), delay);
}

// [NEW] Bagikan daftar peer ke semua koneksi (peer discovery)
function broadcastPeerList(): void {
  const peers = nodeRegistry.getAllNodes().map(n => ({
    nodeId: n.nodeId,
    address: n.address,
    nodeType: n.nodeType,
  }));
  broadcast({ type: "PEER_LIST", from: NODE_ID, payload: { peers }, timestamp: Date.now() });
}

function handleIncomingMessage(msg: P2PMessage, ws: WebSocket): void {
  switch (msg.type) {
    case "HELLO": {
      const peerInfo: PeerInfo = {
        nodeId: msg.from,
        address: String(msg.payload["address"] ?? ""),
        port: Number(msg.payload["p2pPort"] ?? 9080),
        nodeType: (msg.payload["nodeType"] as NodeType) ?? "BASIC_NODE",
        connectedAt: Date.now(),
        lastSeen: Date.now(),
        reputation: 50,
      };
      nodeRegistry.registerNode(peerInfo);
      connections.set(msg.from, ws);
      const ack: P2PMessage = {
        type: "HELLO_ACK", from: NODE_ID, to: msg.from,
        payload: { nodeType: NODE_TYPE, p2pPort: P2P_PORT, state: getStateSnapshot() },
        timestamp: Date.now(),
      };
      ws.send(JSON.stringify(ack));
      // [NEW] kirim daftar peer ke node baru
      broadcastPeerList();
      break;
    }
    case "HELLO_ACK": {
      const peerInfo: PeerInfo = {
        nodeId: msg.from, address: "",
        port: Number(msg.payload["p2pPort"] ?? 9080),
        nodeType: (msg.payload["nodeType"] as NodeType) ?? "BASIC_NODE",
        connectedAt: Date.now(), lastSeen: Date.now(),
        reputation: 50,
      };
      nodeRegistry.registerNode(peerInfo);
      connections.set(msg.from, ws);
      break;
    }
    // [NEW] Terima daftar peer dan sambung ke peer baru (peer discovery)
    case "PEER_LIST": {
      const peers = (msg.payload["peers"] as Array<{ nodeId: string; address: string; nodeType: NodeType }>) ?? [];
      for (const p of peers) {
        if (p.nodeId !== NODE_ID && p.address && !connections.has(p.address)) {
          logger.info({ address: p.address }, "[P2P] Discovered new peer — connecting");
          connectToPeer(p.address);
        }
      }
      break;
    }
    case "HEARTBEAT": {
      nodeRegistry.updateLastSeen(msg.from);
      break;
    }
    // [NEW] Reputasi update dari peer
    case "REPUTATION_UPDATE": {
      const { nodeId, delta } = msg.payload as { nodeId: string; delta: number };
      if (nodeId) nodeRegistry.updateReputation(nodeId, delta);
      break;
    }
    default: {
      for (const handler of messageHandlers) {
        try { handler(msg, msg.from); } catch { /* ignore */ }
      }
      break;
    }
  }
}

// Full broadcast ke semua peer
export function broadcast(message: P2PMessage): void {
  const raw = JSON.stringify(message);
  for (const [, ws] of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(raw); } catch { /* ignore */ }
    }
  }
}

// [NEW] Gossip broadcast — hanya ke sebagian peer (fanout)
export function gossipBroadcast(message: P2PMessage, fanout = 3): void {
  const open = [...connections.entries()].filter(([, ws]) => ws.readyState === WebSocket.OPEN);
  const selected = open.sort(() => Math.random() - 0.5).slice(0, fanout);
  const raw = JSON.stringify(message);
  for (const [, ws] of selected) {
    try { ws.send(raw); } catch { /* ignore */ }
  }
}

export function sendToPeer(peerId: string, message: P2PMessage): boolean {
  const ws = connections.get(peerId);
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try { ws.send(JSON.stringify(message)); return true; } catch { return false; }
}

export function receiveMessage(handler: (msg: P2PMessage, peerId: string) => void): void {
  messageHandlers.push(handler);
}

export function startHeartbeat(): NodeJS.Timeout {
  return setInterval(() => {
    const hb: P2PMessage = {
      type: "HEARTBEAT", from: NODE_ID,
      payload: { uptime: process.uptime(), nodeType: NODE_TYPE, state: getStateSnapshot() },
      timestamp: Date.now(),
    };
    broadcast(hb);
    nodeRegistry.pruneInactive();
  }, 30_000);
}

export function connectToInitialPeers(): void {
  const rawPeers = process.env["INITIAL_PEERS"] ?? "";
  if (!rawPeers) return;
  const peers = rawPeers.split(",").map(p => p.trim()).filter(Boolean);
  for (const peer of peers) connectToPeer(peer);
  logger.info({ count: peers.length }, "[P2P] Connecting to initial peers");
}

export function getP2PStatus() {
  return {
    nodeId: state.nodeId,
    nodeType: state.nodeType,
    p2pPort: state.p2pPort,
    isRunning: state.isRunning,
    connectedPeers: connections.size,
    knownNodes: nodeRegistry.getAllNodes().length,
  };
}
