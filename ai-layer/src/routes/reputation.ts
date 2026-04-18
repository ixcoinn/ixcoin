// ============================================================
// ROUTES/REPUTATION.TS — [NEW] REST endpoints untuk Reputation
// ============================================================

import { Router } from "express";
import { calculateReputation, getAllReputations, getTopNodes, getVotingWeight } from "../ai-layer/reputation_engine.js";
import { nodeRegistry } from "../p2p/node_registry.js";
import { NODE_ID } from "../p2p/p2p_network.js";

const reputationRouter = Router();

reputationRouter.get("/reputation/all", (_req, res) => {
  res.json({ success: true, data: getAllReputations() });
});

reputationRouter.get("/reputation/top", (req, res) => {
  const limit = parseInt(String(req.query["limit"] ?? "10"), 10);
  res.json({ success: true, data: getTopNodes(limit) });
});

reputationRouter.get("/reputation/node/:nodeId", (req, res) => {
  const nodeId = req.params["nodeId"] ?? NODE_ID;
  const score  = calculateReputation(nodeId);
  const weight = getVotingWeight(nodeId);
  res.json({ success: true, data: { ...score, votingWeight: weight } });
});

reputationRouter.get("/reputation/me", (_req, res) => {
  const score  = calculateReputation(NODE_ID);
  const weight = getVotingWeight(NODE_ID);
  res.json({ success: true, data: { ...score, votingWeight: weight } });
});

reputationRouter.get("/reputation/validators", (_req, res) => {
  const validators = nodeRegistry.getValidatorNodes().map(n => ({
    ...n,
    reputation: calculateReputation(n.nodeId),
    votingWeight: getVotingWeight(n.nodeId),
  }));
  res.json({ success: true, data: validators });
});

export default reputationRouter;
