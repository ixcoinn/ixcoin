import {
  pgTable,
  text,
  serial,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiMemoriesTable = pgTable("ai_memories", {
  id: text("id").primaryKey(),
  instanceId: text("instance_id").notNull(),
  memories: jsonb("memories").notNull().default({}),
  checkpointAt: timestamp("checkpoint_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertAiMemorySchema = createInsertSchema(aiMemoriesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertAiMemory = z.infer<typeof insertAiMemorySchema>;
export type AiMemory = typeof aiMemoriesTable.$inferSelect;
