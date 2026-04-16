// ============================================================
// WALLET.TS — 4M IXC Wallet Allocation System
// 2,000,000 IXC Free Immediately
// 2,000,000 IXC Vesting — Unlocks After 1 Year
// ============================================================

import { db } from "@workspace/db";
import { walletAllocationsTable, type WalletAllocation } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const FREE_AMOUNT    = "2000000";
const VESTING_AMOUNT = "2000000";
const ONE_YEAR_MS    = 365 * 24 * 60 * 60 * 1000;

// ── CREATE WALLET ALLOCATION — Buat alokasi 4M IXC ──────────
export async function createWalletAllocation(
  walletAddress: string,
  label = "default",
  notes?: string,
): Promise<WalletAllocation> {
  const existing = await db
    .select()
    .from(walletAllocationsTable)
    .where(eq(walletAllocationsTable.walletAddress, walletAddress))
    .limit(1);

  if (existing[0]) return existing[0];

  const now       = new Date();
  const unlockAt  = new Date(now.getTime() + ONE_YEAR_MS);

  const [allocation] = await db
    .insert(walletAllocationsTable)
    .values({
      walletAddress,
      label,
      freeAmount:      FREE_AMOUNT,
      freeClaimed:     false,
      vestingAmount:   VESTING_AMOUNT,
      vestingStartAt:  now,
      vestingUnlockAt: unlockAt,
      vestingClaimed:  false,
      totalAllocated:  "4000000",
      totalClaimed:    "0",
      status:          "active",
      notes: notes ?? null,
    })
    .returning();

  return allocation;
}

// ── CLAIM FREE — Klaim 2M IXC bebas ─────────────────────────
export async function claimFreeAllocation(
  walletAddress: string,
): Promise<{ success: boolean; amount: string; message: string }> {
  const rows = await db
    .select()
    .from(walletAllocationsTable)
    .where(eq(walletAllocationsTable.walletAddress, walletAddress))
    .limit(1);

  const alloc = rows[0];
  if (!alloc)           return { success: false, amount: "0", message: "Wallet not registered for allocation" };
  if (alloc.freeClaimed) return { success: false, amount: "0", message: "Free allocation already claimed" };

  const now = new Date();
  const newTotal = (parseFloat(alloc.totalClaimed ?? "0") + parseFloat(FREE_AMOUNT)).toString();

  await db.update(walletAllocationsTable).set({
    freeClaimed:   true,
    freeClaimedAt: now,
    totalClaimed:  newTotal,
    updatedAt:     now,
  }).where(eq(walletAllocationsTable.walletAddress, walletAddress));

  return { success: true, amount: FREE_AMOUNT, message: `${FREE_AMOUNT} IXC free allocation claimed successfully` };
}

// ── CLAIM VESTING — Klaim 2M IXC setelah 1 tahun ─────────────
export async function claimVestingAllocation(
  walletAddress: string,
): Promise<{ success: boolean; amount: string; message: string; unlocksAt?: Date }> {
  const rows = await db
    .select()
    .from(walletAllocationsTable)
    .where(eq(walletAllocationsTable.walletAddress, walletAddress))
    .limit(1);

  const alloc = rows[0];
  if (!alloc)              return { success: false, amount: "0", message: "Wallet not registered" };
  if (alloc.vestingClaimed) return { success: false, amount: "0", message: "Vesting allocation already claimed" };

  const now      = new Date();
  const unlockAt = alloc.vestingUnlockAt;

  if (unlockAt && now < unlockAt) {
    return {
      success:   false,
      amount:    "0",
      message:   `Vesting locked until ${unlockAt.toISOString()}`,
      unlocksAt: unlockAt,
    };
  }

  const newTotal = (parseFloat(alloc.totalClaimed ?? "0") + parseFloat(VESTING_AMOUNT)).toString();

  await db.update(walletAllocationsTable).set({
    vestingClaimed:   true,
    vestingClaimedAt: now,
    totalClaimed:     newTotal,
    updatedAt:        now,
  }).where(eq(walletAllocationsTable.walletAddress, walletAddress));

  return { success: true, amount: VESTING_AMOUNT, message: `${VESTING_AMOUNT} IXC vesting allocation claimed successfully` };
}

// ── GET ALLOCATION STATUS — Cek status alokasi ───────────────
export async function getAllocationStatus(
  walletAddress: string,
): Promise<{
  registered:       boolean;
  freeAmount:       string;
  freeClaimed:      boolean;
  vestingAmount:    string;
  vestingClaimed:   boolean;
  vestingUnlocksAt: Date | null;
  vestingLocked:    boolean;
  totalAllocated:   string;
  totalClaimed:     string;
  totalUnclaimed:   string;
} | null> {
  const rows = await db
    .select()
    .from(walletAllocationsTable)
    .where(eq(walletAllocationsTable.walletAddress, walletAddress))
    .limit(1);

  const alloc = rows[0];
  if (!alloc) return null;

  const now          = new Date();
  const vestingLocked = alloc.vestingUnlockAt ? now < alloc.vestingUnlockAt : false;
  const totalClaimed  = parseFloat(alloc.totalClaimed ?? "0");
  const totalAlloc    = parseFloat(alloc.totalAllocated ?? "4000000");

  return {
    registered:       true,
    freeAmount:       alloc.freeAmount ?? FREE_AMOUNT,
    freeClaimed:      alloc.freeClaimed ?? false,
    vestingAmount:    alloc.vestingAmount ?? VESTING_AMOUNT,
    vestingClaimed:   alloc.vestingClaimed ?? false,
    vestingUnlocksAt: alloc.vestingUnlockAt ?? null,
    vestingLocked,
    totalAllocated:   alloc.totalAllocated ?? "4000000",
    totalClaimed:     alloc.totalClaimed ?? "0",
    totalUnclaimed:   (totalAlloc - totalClaimed).toString(),
  };
}

// ── GET ALL ALLOCATIONS — Admin view ─────────────────────────
export async function getAllAllocations(): Promise<WalletAllocation[]> {
  return db.select().from(walletAllocationsTable);
}
