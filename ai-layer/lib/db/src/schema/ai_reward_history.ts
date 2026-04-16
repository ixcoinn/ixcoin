import { pgTable, text, doublePrecision, timestamp } from "drizzle-orm/pg-core";

/**
 * Immutable log of every reward distributed from the AI Ecosystem pool.
 * Used to audit that total distributed never exceeds 5,000,000 IXC.
 */
export const aiRewardHistoryTable = pgTable("ai_reward_history", {
  id: text("id").primaryKey(),
  txHash: text("tx_hash").notNull(),
  rewardAmount: doublePrecision("reward_amount").notNull(),
  receiver: text("receiver").notNull(),
  activityScore: doublePrecision("activity_score").notNull().default(0),
  txCount: doublePrecision("tx_count").notNull().default(0),
  uniqueUsers: doublePrecision("unique_users").notNull().default(0),
  txVolume: doublePrecision("tx_volume").notNull().default(0),
  aiActivity: doublePrecision("ai_activity").notNull().default(0),
  poolRemainingAfter: doublePrecision("pool_remaining_after").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AiRewardHistory = typeof aiRewardHistoryTable.$inferSelect;
