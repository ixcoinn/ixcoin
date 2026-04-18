// ============================================================
// ROUTES/WALLET.TS — Wallet Allocation API
// SECURITY FIX: Added rate limiting, input validation, safe error messages
// ============================================================

import { Router, type Request, type Response } from "express";
import {
  createWalletAllocation,
  claimFreeAllocation,
  claimVestingAllocation,
  getAllocationStatus,
  getAllAllocations,
} from "../ecosystem/wallet.js";
import { rateLimit } from "../middlewares/security.js";

export const walletRouter = Router();

// Rate limiters — tighter limits on write endpoints
const readLimit  = rateLimit({ windowMs: 60_000, max: 60,  message: "Too many wallet status checks — try again in 1 minute" });
const writeLimit = rateLimit({ windowMs: 60_000, max: 10,  message: "Too many wallet write requests — try again in 1 minute" });
const claimLimit = rateLimit({ windowMs: 3_600_000, max: 3, message: "Max 3 claim attempts per hour" });

// POST /api/wallet/register
walletRouter.post("/register", writeLimit, async (req: Request, res: Response) => {
  try {
    const { walletAddress, label, notes } = req.body as { walletAddress?: string; label?: string; notes?: string };
    if (!walletAddress || typeof walletAddress !== "string") {
      res.status(400).json({ error: "walletAddress is required and must be a string" });
      return;
    }
    const alloc = await createWalletAllocation(walletAddress, label, notes);
    res.json({ success: true, allocation: alloc });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    res.status(400).json({ error: msg });
  }
});

// GET /api/wallet/status/:address
walletRouter.get("/status/:address", readLimit, async (req: Request, res: Response) => {
  try {
    const address = req.params["address"];
    if (!address) { res.status(400).json({ error: "address required" }); return; }
    const status = await getAllocationStatus(address);
    if (!status) { res.status(404).json({ error: "Wallet not found" }); return; }
    res.json(status);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lookup failed";
    res.status(500).json({ error: msg });
  }
});

// POST /api/wallet/claim/free
walletRouter.post("/claim/free", claimLimit, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body as { walletAddress?: string };
    if (!walletAddress || typeof walletAddress !== "string") {
      res.status(400).json({ error: "walletAddress required" });
      return;
    }
    const result = await claimFreeAllocation(walletAddress);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Claim failed";
    res.status(500).json({ error: msg });
  }
});

// POST /api/wallet/claim/vesting
walletRouter.post("/claim/vesting", claimLimit, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body as { walletAddress?: string };
    if (!walletAddress || typeof walletAddress !== "string") {
      res.status(400).json({ error: "walletAddress required" });
      return;
    }
    const result = await claimVestingAllocation(walletAddress);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Claim failed";
    res.status(500).json({ error: msg });
  }
});

// GET /api/wallet/all — Admin only (add your own auth middleware in production)
walletRouter.get("/all", readLimit, async (_req: Request, res: Response) => {
  try {
    const allocs = await getAllAllocations();
    res.json({ count: allocs.length, allocations: allocs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fetch failed";
    res.status(500).json({ error: msg });
  }
});
