// ============================================================
// WALLET_ALLOCATIONS.TS — 4M IXC Wallet Allocation Schema
// 2M Free + 2M Vesting (1 Year Unlock)
// ============================================================

import { pgTable, serial, varchar, numeric, timestamp, boolean, integer, text } from "drizzle-orm/pg-core";

export const walletAllocationsTable = pgTable("wallet_allocations", {
  id:             serial("id").primaryKey(),
  walletAddress:  varchar("wallet_address", { length: 256 }).notNull().unique(),
  label:          varchar("label", { length: 128 }).notNull().default("default"),

  // ── Free Allocation: 2,000,000 IXC ──────────────────────
  freeAmount:     numeric("free_amount",     { precision: 20, scale: 8 }).notNull().default("2000000"),
  freeClaimed:    boolean("free_claimed").notNull().default(false),
  freeClaimedAt:  timestamp("free_claimed_at"),

  // ── Vesting Allocation: 2,000,000 IXC (1 year) ──────────
  vestingAmount:    numeric("vesting_amount",    { precision: 20, scale: 8 }).notNull().default("2000000"),
  vestingStartAt:   timestamp("vesting_start_at").notNull().defaultNow(),
  vestingUnlockAt:  timestamp("vesting_unlock_at").notNull(),
  vestingClaimed:   boolean("vesting_claimed").notNull().default(false),
  vestingClaimedAt: timestamp("vesting_claimed_at"),

  // ── Status ───────────────────────────────────────────────
  totalAllocated:  numeric("total_allocated", { precision: 20, scale: 8 }).notNull().default("4000000"),
  totalClaimed:    numeric("total_claimed",   { precision: 20, scale: 8 }).notNull().default("0"),
  status:          varchar("status", { length: 32 }).notNull().default("active"),
  notes:           text("notes"),

  createdAt:  timestamp("created_at").notNull().defaultNow(),
  updatedAt:  timestamp("updated_at").notNull().defaultNow(),
});

export type WalletAllocation = typeof walletAllocationsTable.$inferSelect;
export type NewWalletAllocation = typeof walletAllocationsTable.$inferInsert;
