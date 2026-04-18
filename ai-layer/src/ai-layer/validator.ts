// ============================================================
// VALIDATOR.TS — AI Validator System
// Validator memberikan vote terhadap AI Score
// Final score: ai.score × ai.validationScore
// ============================================================

export interface Validator {
  id:              string;
  name:            string;
  stake:           number;   // IXC staked — lebih besar = lebih berpengaruh
  reputation:      number;   // 0–1: track record validasi yang benar
  isActive:        boolean;
  votesGiven:      number;
  lastVoteAt:      number;
  createdAt:       number;
  specialization?: "activity" | "economy" | "evolution" | "interaction" | "general";
}

export interface ValidatorVote {
  validatorId: string;
  targetAiId:  string;
  score:        number;      // 0–1: seberapa baik validator menilai AI ini
  weight:       number;      // validatorWeight = stake × reputation
  timestamp:    number;
}

export interface ValidationResult {
  aiId:            string;
  validationScore: number;   // 0–1, weighted average dari semua votes
  totalWeight:     number;
  voteCount:       number;
  votes:           ValidatorVote[];
}

// ── IN-MEMORY VALIDATOR REGISTRY ─────────────────────────────
const _validators = new Map<string, Validator>();
let _voteLog: ValidatorVote[] = [];

// ── INIT DEFAULT VALIDATORS ───────────────────────────────────
export function initDefaultValidators(): void {
  const defaults: Validator[] = [
    { id: "val_activity",    name: "ActivityWarden",   stake: 10000, reputation: 0.90, isActive: true, votesGiven: 0, lastVoteAt: 0, createdAt: Date.now(), specialization: "activity" },
    { id: "val_economy",     name: "EconomyAuditor",   stake: 8000,  reputation: 0.85, isActive: true, votesGiven: 0, lastVoteAt: 0, createdAt: Date.now(), specialization: "economy" },
    { id: "val_evolution",   name: "EvolutionTracker", stake: 7000,  reputation: 0.80, isActive: true, votesGiven: 0, lastVoteAt: 0, createdAt: Date.now(), specialization: "evolution" },
    { id: "val_interaction", name: "SocialAnalyst",    stake: 6000,  reputation: 0.82, isActive: true, votesGiven: 0, lastVoteAt: 0, createdAt: Date.now(), specialization: "interaction" },
    { id: "val_general_1",   name: "GeneralVerifier1", stake: 5000,  reputation: 0.75, isActive: true, votesGiven: 0, lastVoteAt: 0, createdAt: Date.now(), specialization: "general" },
    { id: "val_general_2",   name: "GeneralVerifier2", stake: 5000,  reputation: 0.78, isActive: true, votesGiven: 0, lastVoteAt: 0, createdAt: Date.now(), specialization: "general" },
  ];
  for (const v of defaults) _validators.set(v.id, v);
}

// ── GET VALIDATOR WEIGHT ──────────────────────────────────────
export function getValidatorWeight(validator: Validator): number {
  return validator.stake * validator.reputation;
}

// ── REGISTER VALIDATOR ────────────────────────────────────────
export function registerValidator(params: {
  name:            string;
  stake:           number;
  reputation?:     number;
  specialization?: Validator["specialization"];
}): Validator {
  const v: Validator = {
    id:             `val_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name:           params.name,
    stake:          params.stake,
    reputation:     params.reputation ?? 0.5,
    isActive:       true,
    votesGiven:     0,
    lastVoteAt:     0,
    createdAt:      Date.now(),
    specialization: params.specialization ?? "general",
  };
  _validators.set(v.id, v);
  return v;
}

// ── CAST VOTE — Validator memberikan skor ke AI ──────────────
export function castVote(validatorId: string, targetAiId: string, rawScore: number): ValidatorVote | null {
  const v = _validators.get(validatorId);
  if (!v || !v.isActive) return null;

  const score  = Math.max(0, Math.min(1, rawScore));
  const weight = getValidatorWeight(v);
  const vote: ValidatorVote = { validatorId, targetAiId, score, weight, timestamp: Date.now() };

  v.votesGiven++;
  v.lastVoteAt = Date.now();
  _voteLog.push(vote);
  if (_voteLog.length > 10000) _voteLog = _voteLog.slice(-10000);

  return vote;
}

// ── GET VALIDATION RESULT — Hitung validationScore untuk AI ──
export function getValidationResult(aiId: string): ValidationResult {
  const recent = _voteLog.filter(v => v.targetAiId === aiId && Date.now() - v.timestamp < 60_000);

  if (recent.length === 0) {
    return { aiId, validationScore: 1.0, totalWeight: 0, voteCount: 0, votes: [] };
  }

  const sumWeightedScore = recent.reduce((s, v) => s + v.score * v.weight, 0);
  const sumWeight        = recent.reduce((s, v) => s + v.weight, 0);
  const validationScore  = sumWeight > 0 ? sumWeightedScore / sumWeight : 1.0;

  return {
    aiId,
    validationScore: parseFloat(validationScore.toFixed(6)),
    totalWeight: sumWeight,
    voteCount:   recent.length,
    votes:       recent,
  };
}

// ── LIST VALIDATORS ───────────────────────────────────────────
export function listValidators(): Validator[] {
  return Array.from(_validators.values());
}

export function getValidator(id: string): Validator | undefined {
  return _validators.get(id);
}

// ── UPDATE VALIDATOR REPUTATION — Sesuai keakuratan vote ─────
export function updateValidatorReputation(validatorId: string, delta: number): void {
  const v = _validators.get(validatorId);
  if (!v) return;
  v.reputation = Math.max(0.1, Math.min(1.0, v.reputation + delta));
}
