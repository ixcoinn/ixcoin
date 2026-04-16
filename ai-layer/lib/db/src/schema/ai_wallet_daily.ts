import { pgTable, text, doublePrecision, timestamp } from "drizzle-orm/pg-core";

/** Per-wallet daily reward ledger — enforces MAX_WALLET_DAILY cap. */
export const aiWalletDailyTable = pgTable("ai_wallet_daily", {
  id: text("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  date: text("date").notNull(),
  totalReceived: doublePrecision("total_received").notNull().default(0),
  txCount: doublePrecision("tx_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AiWalletDaily = typeof aiWalletDailyTable.$inferSelect;
