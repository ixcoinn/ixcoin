import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const monitorStateTable = pgTable("monitor_state", {
  id: text("id").primaryKey().default("singleton"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  lastBlockHeight: integer("last_block_height"),
  totalTransactionsDetected: integer("total_transactions_detected")
    .notNull()
    .default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertMonitorStateSchema = createInsertSchema(
  monitorStateTable,
).omit({ updatedAt: true });
export type InsertMonitorState = z.infer<typeof insertMonitorStateSchema>;
export type MonitorState = typeof monitorStateTable.$inferSelect;
