import {
  pgTable,
  text,
  serial,
  timestamp,
  doublePrecision,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiStatusEnum = pgEnum("ai_status", [
  "ACTIVE",
  "DORMANT",
  "ARCHIVED",
]);

export const aiInstancesTable = pgTable("ai_instances", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: aiStatusEnum("status").notNull().default("DORMANT"),
  energyLevel: doublePrecision("energy_level").notNull().default(50),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  walletAddress: text("wallet_address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertAiInstanceSchema = createInsertSchema(aiInstancesTable).omit(
  {
    createdAt: true,
    updatedAt: true,
  },
);
export type InsertAiInstance = z.infer<typeof insertAiInstanceSchema>;
export type AiInstance = typeof aiInstancesTable.$inferSelect;
