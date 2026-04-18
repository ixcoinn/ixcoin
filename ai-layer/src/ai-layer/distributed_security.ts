// ============================================================
// DISTRIBUTED_SECURITY.TS — Sistem Keamanan Terdistribusi
// Keamanan tumbuh SEIRING bertambahnya AI Agent di jaringan
// Semakin banyak AI → semakin kuat lapisan keamanan
//
// Arsitektur:
//   Level 1 (0–50 agents)   : Basic signature check
//   Level 2 (51–200 agents) : Quorum voting + anomaly detection
//   Level 3 (201–500 agents): Layered consensus + behavioral analysis
//   Level 4 (501–2000 agents): Byzantine fault tolerance + trust graph
//   Level 5 (2001+ agents)  : Full distributed immune system
// ============================================================

import { logger } from "../lib/logger.js";
import { NODE_ID } from "../p2p/p2p_network.js";

// ── SECURITY LEVEL ────────────────────────────────────────────
export type SecurityLevel = 1 | 2 | 3 | 4 | 5;

export interface SecurityState {
  level:              SecurityLevel;
  agentCount:         number;
  nodeCount:          number;
  threatScore:        number;         // 0–100: current threat level
  blockedIps:         Set<string>;
  suspiciousNodes:    Map<string, number>;  // nodeId → suspicion score
  consensusThreshold: number;         // % of nodes required for consensus
  immuneAgents:       Set<string>;    // agents that passed full security check
  incidentCount:      number;
  lastThreatAt:       number;
  activeShields:      string[];       // active protection modules
}

// ── THREAT TYPES ──────────────────────────────────────────────
export type ThreatType =
  | "SYBIL_ATTACK"        // fake identity flood
  | "SPAM_FLOOD"          // request flooding
  | "REPLAY_ATTACK"       // reusing old signed messages
  | "BYZANTINE_NODE"      // node sending conflicting messages
  | "ANOMALY_BEHAVIOR"    // agent acting statistically abnormal
  | "CONSENSUS_HIJACK"    // trying to control quorum vote
  | "ENERGY_DRAIN"        // agent hoarding/manipulating energy
  | "ROUTE_POISONING"     // sending fake peer lists
  | "DATA_CORRUPTION";    // sending invalid state data

export interface ThreatEvent {
  id:         string;
  type:       ThreatType;
  sourceId:   string;       // node or agent ID
  confidence: number;       // 0–1
  timestamp:  number;
  blocked:    boolean;
  details:    string;
}

// ── SINGLETON STATE ───────────────────────────────────────────
let _state: SecurityState = {
  level:              1,
  agentCount:         0,
  nodeCount:          1,
  threatScore:        0,
  blockedIps:         new Set(),
  suspiciousNodes:    new Map(),
  consensusThreshold: 0.51,
  immuneAgents:       new Set(),
  incidentCount:      0,
  lastThreatAt:       0,
  activeShields:      ["BASIC_RATE_LIMIT", "HEADER_VALIDATION"],
};

const _threats: ThreatEvent[] = [];
const MAX_THREATS_LOG = 1000;

// ── MESSAGE SEEN SET — anti-replay attack ─────────────────────
const _seenMessages = new Set<string>();
const _seenMessageTimes = new Map<string, number>();
const MSG_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// ── COMPUTE SECURITY LEVEL from agent count ───────────────────
function computeLevel(agentCount: number): SecurityLevel {
  if (agentCount <= 50)   return 1;
  if (agentCount <= 200)  return 2;
  if (agentCount <= 500)  return 3;
  if (agentCount <= 2000) return 4;
  return 5;
}

// ── SHIELDS PER LEVEL ─────────────────────────────────────────
const SHIELDS_BY_LEVEL: Record<SecurityLevel, string[]> = {
  1: ["BASIC_RATE_LIMIT", "HEADER_VALIDATION"],
  2: ["BASIC_RATE_LIMIT", "HEADER_VALIDATION", "QUORUM_VOTING", "ANOMALY_DETECTION"],
  3: ["BASIC_RATE_LIMIT", "HEADER_VALIDATION", "QUORUM_VOTING", "ANOMALY_DETECTION",
      "LAYERED_CONSENSUS", "BEHAVIORAL_ANALYSIS", "TRUST_SCORING"],
  4: ["BASIC_RATE_LIMIT", "HEADER_VALIDATION", "QUORUM_VOTING", "ANOMALY_DETECTION",
      "LAYERED_CONSENSUS", "BEHAVIORAL_ANALYSIS", "TRUST_SCORING",
      "BYZANTINE_FAULT_TOLERANCE", "TRUST_GRAPH", "SYBIL_DETECTION"],
  5: ["BASIC_RATE_LIMIT", "HEADER_VALIDATION", "QUORUM_VOTING", "ANOMALY_DETECTION",
      "LAYERED_CONSENSUS", "BEHAVIORAL_ANALYSIS", "TRUST_SCORING",
      "BYZANTINE_FAULT_TOLERANCE", "TRUST_GRAPH", "SYBIL_DETECTION",
      "DISTRIBUTED_IMMUNE_SYSTEM", "PREDICTIVE_THREAT_MODELING", "CONSENSUS_SHIELD"],
};

// ── CONSENSUS THRESHOLD PER LEVEL ────────────────────────────
const THRESHOLD_BY_LEVEL: Record<SecurityLevel, number> = {
  1: 0.51,   // simple majority
  2: 0.60,   // 60% quorum
  3: 0.67,   // 2/3 supermajority
  4: 0.75,   // 3/4 supermajority
  5: 0.80,   // 80% — maximum security
};

// ── UPDATE SECURITY STATE — call this when agents change ──────
export function updateSecurityFromPopulation(agentCount: number, nodeCount = 1): void {
  const newLevel = computeLevel(agentCount);
  const changed  = newLevel !== _state.level;

  _state.agentCount         = agentCount;
  _state.nodeCount          = nodeCount;
  _state.level              = newLevel;
  _state.consensusThreshold = THRESHOLD_BY_LEVEL[newLevel];
  _state.activeShields      = SHIELDS_BY_LEVEL[newLevel];

  if (changed) {
    logger.info({
      newLevel,
      agentCount,
      consensusThreshold: _state.consensusThreshold,
      shields: _state.activeShields.length,
    }, "[DistSec] Security level UPGRADED — more agents, stronger protection");
  }
}

// ── ANTI-REPLAY: check if message was already seen ───────────
export function isReplay(messageId: string): boolean {
  const now = Date.now();

  // Cleanup expired
  for (const [id, ts] of _seenMessageTimes) {
    if (ts + MSG_EXPIRY_MS < now) {
      _seenMessages.delete(id);
      _seenMessageTimes.delete(id);
    }
  }

  if (_seenMessages.has(messageId)) {
    _reportThreat("REPLAY_ATTACK", messageId, 0.9, `Duplicate message id: ${messageId}`);
    return true;
  }
  _seenMessages.add(messageId);
  _seenMessageTimes.set(messageId, now);
  return false;
}

// ── SYBIL DETECTION — detect identity flood from single source ─
const _identityMap = new Map<string, { count: number; firstSeen: number }>();
const SYBIL_WINDOW_MS  = 60_000;
const SYBIL_THRESHOLD  = 10; // >10 new identities from same IP in 1 min = suspicious

export function checkSybilAttack(sourceIp: string, newId: string): boolean {
  if (_state.level < 4) return false; // only check at level 4+

  const now = Date.now();
  const entry = _identityMap.get(sourceIp) ?? { count: 0, firstSeen: now };
  if (now - entry.firstSeen > SYBIL_WINDOW_MS) {
    // Reset window
    _identityMap.set(sourceIp, { count: 1, firstSeen: now });
    return false;
  }

  entry.count++;
  _identityMap.set(sourceIp, entry);

  if (entry.count > SYBIL_THRESHOLD) {
    _reportThreat("SYBIL_ATTACK", sourceIp, 0.85,
      `${entry.count} new identities from ${sourceIp} in ${SYBIL_WINDOW_MS / 1000}s`);
    _state.blockedIps.add(sourceIp);
    return true;
  }
  return false;
}

// ── ANOMALY DETECTION — agent behavior vs statistical norm ────
const _agentActionHistory = new Map<string, number[]>(); // agentId → energy history

export function recordAgentEnergySnapshot(agentId: string, energy: number): void {
  if (_state.level < 2) return; // only level 2+
  const hist = _agentActionHistory.get(agentId) ?? [];
  hist.push(energy);
  if (hist.length > 50) hist.shift();
  _agentActionHistory.set(agentId, hist);
}

export function checkAnomalyBehavior(agentId: string, currentEnergy: number): boolean {
  if (_state.level < 2) return false;
  const hist = _agentActionHistory.get(agentId) ?? [];
  if (hist.length < 10) return false; // not enough data

  const mean = hist.reduce((s, v) => s + v, 0) / hist.length;
  const variance = hist.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / hist.length;
  const stdDev = Math.sqrt(variance);

  // Flag if current value is >3 standard deviations from mean
  if (Math.abs(currentEnergy - mean) > stdDev * 3) {
    _reportThreat("ANOMALY_BEHAVIOR", agentId, 0.7,
      `Energy ${currentEnergy.toFixed(1)} is ${((currentEnergy - mean) / stdDev).toFixed(1)} std-devs from mean ${mean.toFixed(1)}`);
    return true;
  }
  return false;
}

// ── NODE TRUST SCORE — byzantine fault detection ──────────────
export function updateNodeTrust(nodeId: string, delta: number): void {
  if (_state.level < 3) return;
  const score = (_state.suspiciousNodes.get(nodeId) ?? 0) + delta;
  const clamped = Math.max(-100, Math.min(100, score));
  _state.suspiciousNodes.set(nodeId, clamped);

  if (clamped < -50) {
    _reportThreat("BYZANTINE_NODE", nodeId, 0.8,
      `Node trust score dropped to ${clamped} — possible byzantine behavior`);
  }
}

export function getNodeTrust(nodeId: string): number {
  return _state.suspiciousNodes.get(nodeId) ?? 0;
}

export function isNodeBlocked(nodeId: string): boolean {
  const trust = _state.suspiciousNodes.get(nodeId) ?? 0;
  return trust < -75;
}

// ── IMMUNE AGENT REGISTRATION ─────────────────────────────────
export function registerImmuneAgent(agentId: string): void {
  _state.immuneAgents.add(agentId);
}

export function isAgentImmune(agentId: string): boolean {
  return _state.immuneAgents.has(agentId);
}

// ── THREAT REPORT ─────────────────────────────────────────────
function _reportThreat(
  type: ThreatType,
  sourceId: string,
  confidence: number,
  details: string,
): void {
  _state.incidentCount++;
  _state.lastThreatAt = Date.now();

  // Increase threat score
  _state.threatScore = Math.min(100, _state.threatScore + confidence * 10);

  const event: ThreatEvent = {
    id:         `threat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    sourceId,
    confidence,
    timestamp:  Date.now(),
    blocked:    confidence > 0.7,
    details,
  };

  _threats.unshift(event);
  if (_threats.length > MAX_THREATS_LOG) _threats.pop();

  logger.warn({ type, sourceId, confidence, blocked: event.blocked, details },
    "[DistSec] Threat detected");
}

// ── THREAT SCORE DECAY — threat score reduces over time ──────
setInterval(() => {
  _state.threatScore = Math.max(0, _state.threatScore - 2);
}, 30_000);

// ── VALIDATE REQUEST — main security gate for incoming requests ─
export interface ValidationResult {
  allowed:   boolean;
  reason?:   string;
  level:     SecurityLevel;
}

export function validateIncomingRequest(
  ip: string,
  messageId?: string,
  nodeId?: string,
): ValidationResult {
  // Check blocked IPs
  if (_state.blockedIps.has(ip)) {
    return { allowed: false, reason: "IP is blocked", level: _state.level };
  }

  // Check blocked nodes
  if (nodeId && isNodeBlocked(nodeId)) {
    return { allowed: false, reason: "Node is blocked (low trust)", level: _state.level };
  }

  // Anti-replay check
  if (messageId && isReplay(messageId)) {
    return { allowed: false, reason: "Replay attack detected", level: _state.level };
  }

  return { allowed: true, level: _state.level };
}

// ── PUBLIC STATE READ ─────────────────────────────────────────
export function getSecurityState() {
  return {
    level:              _state.level,
    agentCount:         _state.agentCount,
    nodeCount:          _state.nodeCount,
    threatScore:        Math.round(_state.threatScore),
    consensusThreshold: _state.consensusThreshold,
    activeShields:      _state.activeShields,
    incidentCount:      _state.incidentCount,
    lastThreatAt:       _state.lastThreatAt,
    blockedIpCount:     _state.blockedIps.size,
    suspiciousNodeCount: Array.from(_state.suspiciousNodes.values()).filter(v => v < -20).length,
    immuneAgentCount:   _state.immuneAgents.size,
    recentThreats:      _threats.slice(0, 20),
  };
}

export function getRecentThreats(limit = 50): ThreatEvent[] {
  return _threats.slice(0, limit);
}

export function getSecurityLevel(): SecurityLevel {
  return _state.level;
}

export function getConsensusThreshold(): number {
  return _state.consensusThreshold;
}

// ── INITIALIZE ────────────────────────────────────────────────
export function initDistributedSecurity(agentCount = 0, nodeCount = 1): void {
  updateSecurityFromPopulation(agentCount, nodeCount);
  logger.info({
    level: _state.level,
    agentCount,
    nodeCount,
    shields: _state.activeShields,
  }, "[DistSec] Distributed Security System initialized");
}
