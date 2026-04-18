// ============================================================
  // TYPES.TS — AI DNA System (Original + Upgraded)
  // Connects to: engine.ts, civilization.ts, interaction.ts,
  //              evolution.ts, world.ts, economy.ts, loop.ts
  // ============================================================

  // ── ORIGINAL TYPES (preserved) ──────────────────────────────
  export type AiRole = "guardian" | "optimizer" | "balancer";
  export type AiPersonality = "aggressive" | "cautious" | "balanced" | "adaptive";

  export interface AiState {
    aiId: string;
    name: string;
    role: AiRole;
    personality: AiPersonality;
    level: number;
    experience: number;
    energy: number;
    maxEnergy: number;
    isActive: boolean;
  }

  export interface EcosystemEnvironment {
    totalPool: number;
    distributedTotal: number;
    networkActivity: number;
    currentRewardRate: number;
    activeAiCount: number;
    cycleCount: number;
  }

  export interface DecisionContext {
    ai: AiState;
    environment: EcosystemEnvironment;
    recentMemory: Array<{ eventType: string; impact: number; createdAt: Date }>;
    competingAis: AiState[];
  }

  export interface AiDecision {
    actionType: string;
    decision: string;
    recommendedReward: number; // [FIX] AI hanya MEREKOMENDASIKAN — bukan final, harus melalui PoW
    energyCost: number;
    expGained: number;
    outcome: string;
    metadata: Record<string, unknown>;
  }

  // ── NEW TYPES — AUTONOMOUS DIGITAL CIVILIZATION ─────────────

  export type PrimaryGoal = "survive" | "grow" | "dominate" | "cooperate";
  export type Rank = "normal" | "elite" | "leader";
  export type Ideology = "aggressive" | "cooperative" | "expansionist" | "defensive";
  export type ActionType =
    | "trade" | "cooperate" | "attack" | "ignore"
    | "explore" | "rest" | "recruit" | "betray";

  // GOAL SYSTEM — Tujuan Hidup
  export interface GoalSystem {
    primaryGoal: PrimaryGoal;
    secondaryGoals: string[];
    priorityLevel: number;
  }

  // DESIRE SYSTEM — Motivasi Internal
  export interface DesireSystem {
    energy: number;
    power: number;
    social: number;
    exploration: number;
  }

  // SOCIAL SYSTEM — Hubungan Antar AI
  export interface SocialRelations {
    friends: string[];
    enemies: string[];
    alliances: string[];
  }

  export interface Reputation {
    trustScore: number;
    hostilityScore: number;
  }

  // EVOLUTION DATA
  export interface EvolutionData {
    mutationRate: number;
    adaptationScore: number;
    generationsSurvived: number;
    lastMutatedAt?: number;
  }

  // INTERACTION MEMORY — Ingatan jangka panjang
  export interface InteractionMemory {
    agentId: string;
    type: ActionType;
    outcome: "success" | "failure" | "neutral";
    energyDelta: number;
    timestamp: number;
  }

  // FULL AI AGENT — Autonomous Living Agent
  export interface AIAgent {
    id: string;
    name: string;
    energy: number;
    maxEnergy: number;
    personality: {
      aggression: number;
      cooperation: number;
      curiosity: number;
      caution: number;
    };
    ideology: Ideology;
    rank: Rank;
    goals: GoalSystem;
    desires: DesireSystem;
    relations: SocialRelations;
    reputation: Reputation;
    evolution: EvolutionData;
    groupId?: string;
    isAlive: boolean;
    memory: InteractionMemory[];
    lastAction?: ActionType;
    lastActionAt?: number;
    actionCount: number;
    age: number;
    wealth: number;
  }

  // GROUP / TRIBE SYSTEM
  export interface Group {
    groupId: string;
    name: string;
    members: string[];
    leaderId?: string;
    ideology: Ideology;
    strength: number;
    resources: number;
    createdAt: number;
    warsWith: string[];
    alliesWith: string[];
    isActive: boolean;
  }

  // WORLD STATE — Kondisi Dunia Global
  export interface WorldState {
    cycle: number;
    totalPopulation: number;
    alivePopulation: number;
    resourceLevel: number;
    dangerLevel: number;
    activityLevel: number;
    conflictCount: number;
    allianceCount: number;
    deathCount: number;
    birthCount: number;
    tradeVolume: number;
    dominantIdeology?: Ideology;
    lastUpdatedAt: number;
  }

  // MARKET STATE — Ekonomi Dinamis
  export interface MarketState {
    energyPrice: number;
    supplyLevel: number;
    demandLevel: number;
    recentTrades: number;
    priceHistory: number[];
    volatility: number;
  }

  // SIMULATION STATS
  export interface SimulationStats {
    totalCycles: number;
    totalInteractions: number;
    totalDeaths: number;
    totalMutations: number;
    totalGroupsFormed: number;
    totalGroupsDissolved: number;
    totalWars: number;
    totalAlliances: number;
    peakPopulation: number;
    currentTime: number;
    alivePopulation: number;
  }

  // CIVILIZATION STATE — Master State
  export interface CivilizationState {
    agents: Map<string, AIAgent>;
    groups: Map<string, Group>;
    world: WorldState;
    market: MarketState;
    stats: SimulationStats;
    isRunning: boolean;
    cycleInterval: number;
    eventLog: CivilizationEvent[];
  }

  // EVENTS — Kejadian dalam Dunia
  export interface CivilizationEvent {
    id: string;
    type:
      | "death" | "birth" | "war" | "alliance" | "trade"
      | "mutation" | "group_formed" | "group_dissolved"
      | "rank_change" | "ideology_shift";
    actorId?: string;
    targetId?: string;
    groupId?: string;
    description: string;
    timestamp: number;
    cycle: number;
  }

  // DECISION CONTEXT — For the new engine
  export interface LiveDecisionContext {
    agent: AIAgent;
    world: WorldState;
    market: MarketState;
    nearbyAgents: AIAgent[];
    ownGroup?: Group;
  }

  // INTERACTION RESULT
  export interface InteractionResult {
    success: boolean;
    actionType: ActionType;
    actorId: string;
    targetId: string;
    actorEnergyDelta: number;
    targetEnergyDelta: number;
    reputationDelta: number;
    description: string;
    relationshipChange?: "improved" | "degraded" | "broken" | "formed";
  }
  
// ============================================================
// UPGRADE: AUTONOMOUS DIGITAL CIVILIZATION — Extended Types
// Appended to existing types.ts — NO original code removed
// ============================================================

// ── 1. AIGOAL ENUM — Tujuan Hidup Formal ─────────────────────
export enum AIGoal {
  SURVIVE  = "SURVIVE",
  EARN     = "EARN",
  EXPAND   = "EXPAND",
  DOMINATE = "DOMINATE",
}

// ── 2. NEEDS SYSTEM — Kebutuhan Dasar AI ─────────────────────
export interface NeedsSystem {
  energy:  number;   // 0–100: habis → AI mati
  wealth:  number;   // 0–∞:   dari aktivitas ekonomi
  hunger:  number;   // 0–100: naik tiap tick, turun saat earn/trade
}

// ── 3. AI ACTION TYPES — Aksi Formal ──────────────────────────
export type AIActionType =
  | "SEARCH_ENERGY"
  | "EARN_WEALTH"
  | "EXPLORE"
  | "COMPETE"
  | "REST_AND_HEAL"
  | "TRADE_RESOURCE"
  | "RECRUIT_ALLY"
  | "BETRAY_ENEMY";

// ── 4. AI ACTION — Struktur Lengkap ──────────────────────────
export interface AIAction {
  type:        AIActionType;
  actorId:     string;
  targetId?:   string;
  energyCost:  number;
  wealthDelta: number;
  hungerDelta: number;
  description: string;
  timestamp:   number;
}

// ── 5. BLOCKCHAIN EVENT — Trigger dari Network ───────────────
export interface BlockchainTx {
  txHash:      string;
  from:        string;
  to:          string;
  amount:      number;
  blockHeight: number;
  timestamp:   number;
}

export interface BlockchainBlock {
  blockHash:   string;
  blockHeight: number;
  txCount:     number;
  timestamp:   number;
}

// ── 6. EXTENDED AI AGENT NEEDS — mixin interface ─────────────
export interface AIAgentNeeds {
  needs:      NeedsSystem;
  formalGoal: AIGoal;
}

// ── 7. GLOBAL RESOURCE POOL ───────────────────────────────────
export interface GlobalResourcePool {
  total:          number;
  available:      number;
  consumed:       number;
  replenishRate:  number;
  lastUpdated:    number;
}

// ── 8. COMPETITION RESULT — AI vs AI ─────────────────────────
export interface CompetitionResult {
  winnerId:       string;
  loserId:        string;
  resourceGained: number;
  resourceLost:   number;
  winnerEnergy:   number;
  loserEnergy:    number;
  description:    string;
}

// ── 9. CIVILIZATION METRICS ───────────────────────────────────
export interface CivilizationMetrics {
  totalAlive:    number;
  totalDead:     number;
  totalBorn:     number;
  resourceUsage: number;
  economyVolume: number;
  conflictRate:  number;
  growthRate:    number;
  dominantGoal:  AIGoal | null;
  cycle:         number;
  timestamp:     number;
}

// ============================================================
// UPGRADE: AI SCORE ECONOMY — Extended Types
// Appended — NO original code removed
// ============================================================

// ── 10. AI METRICS — Komponen Skor AI ─────────────────────────
export interface AIMetrics {
  activity:    number;    // Seberapa aktif AI bertindak
  interaction: number;    // Seberapa banyak AI berinteraksi sosial
  economy:     number;    // Kontribusi ekonomi (trade, wealth)
  evolution:   number;    // Perkembangan & adaptasi AI
}

// ── 11. EXTENDED AGENT SCORE FIELDS ───────────────────────────
// Ditambahkan ke AIAgent via intersection, tidak mengubah interface asli
export interface AIScoreFields {
  metrics?:         AIMetrics;   // Komponen metrik raw
  score?:           number;      // AI Score = metrics × weight (0–100)
  validationScore?: number;      // Validation score dari Validator network (0–1)
  finalScore?:      number;      // finalScore = score × validationScore
  balance?:         number;      // Saldo IXC internal AI
  ownerWallet?:     string;      // Alamat wallet pemilik untuk menerima reward
  livingCost?:      number;      // Biaya hidup per siklus (dynamic)
}

// ── 12. FAST TX — Transaksi AI Execution Layer ────────────────
export interface FastTxRef {
  txId:          string;
  status:        "PENDING" | "AI_SCREENED" | "AI_REJECTED" | "POW_CONFIRMED" | "EXPIRED" | "REJECTED"; // [FIX] AI_APPROVED → AI_SCREENED; ditambah EXPIRED
  priorityScore: number;
  fee:           number;
  priorityFee:   number;
}

// ── 13. ECONOMY PHASE ─────────────────────────────────────────
export type EconomyPhase = "PHASE_1" | "PHASE_2" | "PHASE_3";
