// ============================================================
// WALLET.TS — 4M IXC Wallet Allocation System
// 2,000,000 IXC Free Immediately
// 2,000,000 IXC Vesting — Unlocks After 1 Year
// FIX: Added getAllocationStatus and getAllAllocations (were missing, imported by routes)
// FIX: Added wallet address format validation
// ============================================================

import { db, isDbAvailable } from "../../lib/db/src/index.js";
import { walletAllocationsTable, type WalletAllocation } from "../../lib/db/src/index.js";
import { eq } from "drizzle-orm";

const FREE_AMOUNT    = "2000000";
const VESTING_AMOUNT = "2000000";
const ONE_YEAR_MS    = 365 * 24 * 60 * 60 * 1000;

// FIX: Validate wallet address format (basic check — no-DB injection protection)
function validateWalletAddress(addr: string): boolean {
  if (!addr || addr.length < 10 || addr.length > 256) return false;
  // Accept basic alphanumeric + typical blockchain address chars
  return /^[a-zA-Z0-9_\-.:]+$/.test(addr);
}

// ── GUARD: DB required for wallet operations ─────────────────
function requireDb(): void {
  if (!isDbAvailable()) {
    throw new Error("Database not available — wallet operations require DATABASE_URL");
  }
}

// ── CREATE WALLET ALLOCATION — Buat alokasi 4M IXC ──────────
export async function createWalletAllocation(
  walletAddress: string,
  label = "default",
  notes?: string,
): Promise<WalletAllocation> {
  requireDb();
  if (!validateWalletAddress(walletAddress)) {
    throw new Error("Invalid wallet address format");
  }

  const existing = await db
    .select()
    .from(walletAllocationsTable)
    .where(eq(walletAllocationsTable.walletAddress, walletAddress))
    .limit(1);

  if (existing[0]) return existing[0];

  const now      = new Date();
  const unlockAt = new Date(now.getTime() + ONE_YEAR_MS);

  const [allocation] = await db
    .insert(walletAllocationsTable)
    .values({
      walletAddress,
      label: label.slice(0, 128),
      freeAmount:      FREE_AMOUNT,
      freeClaimed:     false,
      vestingAmount:   VESTING_AMOUNT,
      vestingStartAt:  now,
      vestingUnlockAt: unlockAt,
      vestingClaimed:  false,
      totalAllocated:  "4000000",
      totalClaimed:    "0",
      status:          "active",
      notes:           notes ? notes.slice(0, 500) : null,
    })
    .returning();

  return allocation;
}

// ── CLAIM FREE — Klaim 2M IXC bebas ─────────────────────────
export async function claimFreeAllocation(
  walletAddress: string,
): Promise<{ success: boolean; amount: string; message: string }> {
  requireDb();
  if (!validateWalletAddress(walletAddress)) {
    return { success: false, amount: "0", message: "Invalid wallet address format" };
  }

  const rows = await db
    .select()
    .from(walletAllocationsTable)
    .where(eq(walletAllocationsTable.walletAddress, walletAddress))
    .limit(1);

  const alloc = rows[0];
  if (!alloc)            return { success: false, amount: "0", message: "Wallet not registered for allocation" };
  if (alloc.freeClaimed) return { success: false, amount: "0", message: "Free allocation already claimed" };

  const now      = new Date();
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
  requireDb();
  if (!validateWalletAddress(walletAddress)) {
    return { success: false, amount: "0", message: "Invalid wallet address format" };
  }

  const rows = await db
    .select()
    .from(walletAllocationsTable)
    .where(eq(walletAllocationsTable.walletAddress, walletAddress))
    .limit(1);

  const alloc = rows[0];
  if (!alloc)               return { success: false, amount: "0", message: "Wallet not registered for allocation" };
  if (alloc.vestingClaimed) return { success: false, amount: "0", message: "Vesting allocation already claimed" };

  const now      = new Date();
  const unlockAt = alloc.vestingUnlockAt ? new Date(alloc.vestingUnlockAt) : null;

  if (!unlockAt || now < unlockAt) {
    return {
      success:   false,
      amount:    "0",
      message:   "Vesting period has not ended yet",
      unlocksAt: unlockAt ?? undefined,
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

// ── GET ALLOCATION STATUS — FIX: was missing, imported in routes ─
export async function getAllocationStatus(walletAddress: string): Promise<WalletAllocation | null> {
  requireDb();
  if (!validateWalletAddress(walletAddress)) return null;

  const rows = await db
    .select()
    .from(walletAllocationsTable)
    .where(eq(walletAllocationsTable.walletAddress, walletAddress))
    .limit(1);

  return rows[0] ?? null;
}

// ── GET ALL ALLOCATIONS — FIX: was missing, imported in routes ─
export async function getAllAllocations(): Promise<WalletAllocation[]> {
  requireDb();
  return db.select().from(walletAllocationsTable);
}
