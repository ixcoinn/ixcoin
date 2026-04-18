import {
  pgTable,
  text,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventTypeEnum = pgEnum("activity_event_type", [
  "TRANSACTION_DETECTED",
  "AI_ACTIVATED",
  "AI_DORMANT",
  "AI_ARCHIVED",
  "ENERGY_CHANGED",
]);

export const activityEventsTable = pgTable("activity_events", {
  id: text("id").primaryKey(),
  eventType: eventTypeEnum("event_type").notNull(),
  instanceId: text("instance_id"),
  details: jsonb("details").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertActivityEventSchema = createInsertSchema(
  activityEventsTable,
).omit({ createdAt: true });
export type InsertActivityEvent = z.infer<typeof insertActivityEventSchema>;
export type ActivityEvent = typeof activityEventsTable.$inferSelect;
