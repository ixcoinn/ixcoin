// ============================================================
// ROUTES/SECURITY.TS — Distributed Security API Endpoints
// ============================================================

import { Router } from "express";
import {
  getSecurityState,
  getRecentThreats,
  getSecurityLevel,
  getConsensusThreshold,
  updateSecurityFromPopulation,
} from "../ai-layer/distributed_security.js";
import { rateLimit } from "../middlewares/security.js";

const securityRouter = Router();

const readLimit = rateLimit({ windowMs: 60_000, max: 30, message: "Too many security status requests" });

// GET /api/security/status — full security state
securityRouter.get("/security/status", readLimit, (_req, res) => {
  res.json({ success: true, data: getSecurityState() });
});

// GET /api/security/level — current security level (1-5)
securityRouter.get("/security/level", readLimit, (_req, res) => {
  res.json({
    success: true,
    data: {
      level:              getSecurityLevel(),
      consensusThreshold: getConsensusThreshold(),
      description:        getLevelDescription(getSecurityLevel()),
    },
  });
});

// GET /api/security/threats — recent threat events
securityRouter.get("/security/threats", readLimit, (req, res) => {
  const limit = Math.min(parseInt(String(req.query["limit"] ?? "20"), 10), 100);
  res.json({ success: true, data: getRecentThreats(limit) });
});

function getLevelDescription(level: number): string {
  switch (level) {
    case 1: return "Basic — Rate limiting & header validation (0–50 agents)";
    case 2: return "Standard — Quorum voting & anomaly detection (51–200 agents)";
    case 3: return "Enhanced — Layered consensus & behavioral analysis (201–500 agents)";
    case 4: return "Advanced — Byzantine fault tolerance & trust graph (501–2000 agents)";
    case 5: return "Maximum — Full distributed immune system (2001+ agents)";
    default: return "Unknown";
  }
}

export default securityRouter;
