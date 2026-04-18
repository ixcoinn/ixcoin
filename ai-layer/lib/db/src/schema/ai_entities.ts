import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export type AiRole = "guardian" | "optimizer" | "balancer";
export type AiPersonality = "aggressive" | "cooperative" | "analytical" | "chaotic";

export interface AiEntity {
  id: number;
  aiId: string;
  name: string;
  role: AiRole;
  personality: AiPersonality;
  level: number;
  experience: number;
  energy: number;
  maxEnergy: number;
  isActive: number;
  lastActionAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface EcosystemState {
  id: number;
  totalPool: number;
  distributedTotal: number;
  networkActivity: number;
  currentRewardRate: number;
  activeAiCount: number;
  cycleCount: number;
  lastCycleAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export const aiEntitiesTable = pgTable("ai_entities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  aiId: text("ai_id").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  personality: text("personality").notNull(),
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  energy: real("energy").notNull().default(100),
  maxEnergy: real("max_energy").notNull().default(100),
  isActive: integer("is_active").notNull().default(1),
  lastActionAt: timestamp("last_action_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const aiActionsTable = pgTable("ai_actions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  aiId: text("ai_id").notNull(),
  actionType: text("action_type").notNull(),
  decision: text("decision"),
  recommendedReward: real("recommended_reward").default(0),
  energyCost: real("energy_cost").default(0),
  expGained: real("exp_gained").default(0),
  networkActivity: real("network_activity").default(0),
  poolRemaining: real("pool_remaining").default(0),
  outcome: text("outcome"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const aiMemoryTable = pgTable("ai_memory", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  aiId: text("ai_id").notNull(),
  eventType: text("event_type").notNull(),
  data: jsonb("data"),
  impact: real("impact").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const ecosystemStateTable = pgTable("ecosystem_state", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  totalPool: real("total_pool").notNull().default(5_000_000),
  distributedTotal: real("distributed_total").notNull().default(0),
  networkActivity: real("network_activity").notNull().default(0.5),
  currentRewardRate: real("current_reward_rate").notNull().default(1.0),
  activeAiCount: integer("active_ai_count").notNull().default(0),
  cycleCount: integer("cycle_count").notNull().default(0),
  lastCycleAt: timestamp("last_cycle_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
