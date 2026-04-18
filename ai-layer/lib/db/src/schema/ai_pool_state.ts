import { pgTable, text, doublePrecision, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Tracks the single AI Ecosystem reward pool (5,000,000 IXC cap).
 *
 * SUPPLY RULES enforced here:
 *  - `remaining` only ever decreases — never increases
 *  - `distributed` + `remaining` must always equal `totalPool` (5,000,000)
 *  - `isExhausted` is set permanently true when remaining reaches 0
 *  - No insert of new pool records is permitted — singleton row only
 */
export const aiPoolStateTable = pgTable("ai_pool_state", {
  id: text("id").primaryKey(),
  totalPool: doublePrecision("total_pool").notNull().default(5000000),
  remaining: doublePrecision("remaining").notNull().default(5000000),
  distributed: doublePrecision("distributed").notNull().default(0),
  isExhausted: boolean("is_exhausted").notNull().default(false),
  dailyEmitted: doublePrecision("daily_emitted").notNull().default(0),
  dailyEmitDate: text("daily_emit_date"),
  lastDistributedAt: timestamp("last_distributed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AiPoolState = typeof aiPoolStateTable.$inferSelect;
