export type AiStatus = "ACTIVE" | "DORMANT" | "ARCHIVED";

export interface AiStateRecord {
  id: string;
  name: string;
  status: AiStatus;
  energyLevel: number;
  lastActiveAt: Date | null;
  walletAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ENERGY_MAX = 100;
export const ENERGY_MIN = 0;
export const ENERGY_GAIN_PER_TX = 15;
export const ENERGY_DRAIN_RATE = 5;
export const DORMANT_AFTER_SECONDS = 300;
export const ARCHIVE_AFTER_SECONDS = 86400 * 7;

export function calcEnergyAfterTx(current: number): number {
  return Math.min(ENERGY_MAX, current + ENERGY_GAIN_PER_TX);
}

export function calcEnergyDrain(current: number): number {
  return Math.max(ENERGY_MIN, current - ENERGY_DRAIN_RATE);
}

export function shouldGoDormant(
  lastActiveAt: Date | null,
  nowMs: number,
): boolean {
  if (!lastActiveAt) return true;
  const diffSeconds = (nowMs - lastActiveAt.getTime()) / 1000;
  return diffSeconds >= DORMANT_AFTER_SECONDS;
}

export function shouldArchive(
  lastActiveAt: Date | null,
  nowMs: number,
): boolean {
  if (!lastActiveAt) return false;
  const diffSeconds = (nowMs - lastActiveAt.getTime()) / 1000;
  return diffSeconds >= ARCHIVE_AFTER_SECONDS;
}
