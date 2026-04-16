// ============================================================
// ROUTES/WALLET.TS — Wallet Allocation API Endpoints
// ============================================================

import { Router, type Request, type Response } from "express";
import {
  createWalletAllocation,
  claimFreeAllocation,
  claimVestingAllocation,
  getAllocationStatus,
  getAllAllocations,
} from "../ecosystem/wallet.js";

export const walletRouter = Router();

// POST /api/wallet/register — Daftarkan wallet untuk alokasi
walletRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { walletAddress, label, notes } = req.body as { walletAddress?: string; label?: string; notes?: string };
    if (!walletAddress) return res.status(400).json({ error: "walletAddress required" });
    const alloc = await createWalletAllocation(walletAddress, label, notes);
    return res.json({ success: true, allocation: alloc });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// GET /api/wallet/status/:address — Status alokasi wallet
walletRouter.get("/status/:address", async (req: Request, res: Response) => {
  try {
    const status = await getAllocationStatus(req.params.address);
    if (!status) return res.status(404).json({ error: "Wallet not found" });
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// POST /api/wallet/claim/free — Klaim 2M IXC free
walletRouter.post("/claim/free", async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body as { walletAddress?: string };
    if (!walletAddress) return res.status(400).json({ error: "walletAddress required" });
    const result = await claimFreeAllocation(walletAddress);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// POST /api/wallet/claim/vesting — Klaim 2M IXC vesting (setelah 1 tahun)
walletRouter.post("/claim/vesting", async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body as { walletAddress?: string };
    if (!walletAddress) return res.status(400).json({ error: "walletAddress required" });
    const result = await claimVestingAllocation(walletAddress);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// GET /api/wallet/all — Admin: semua alokasi
walletRouter.get("/all", async (_req: Request, res: Response) => {
  try {
    const all = await getAllAllocations();
    return res.json({ count: all.length, allocations: all });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});
