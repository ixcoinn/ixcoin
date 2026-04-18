import { db, aiRewardHistoryTable, aiWalletDailyTable } from "../../lib/db/src/index.js";
import { desc, eq } from "drizzle-orm";

export interface RewardRecord {
  id: string;
  txHash: string;
  rewardAmount: number;
  receiver: string;
  activityScore: number;
  txCount: number;
  uniqueUsers: number;
  txVolume: number;
  aiActivity: number;
  poolRemainingAfter: number;
  createdAt: Date;
}

export async function getRewardHistory(limit = 50): Promise<RewardRecord[]> {
  const records = await db
    .select()
    .from(aiRewardHistoryTable)
    .orderBy(desc(aiRewardHistoryTable.createdAt))
    .limit(limit);
  return records as RewardRecord[];
}

export async function getRewardStats() {
  const allRecords = await db.select().from(aiRewardHistoryTable);

  const totalDistributed = allRecords.reduce((s, r) => s + r.rewardAmount, 0);
  const totalEvents      = allRecords.length;
  const avgScore         = totalEvents > 0
    ? allRecords.reduce((s, r) => s + r.activityScore, 0) / totalEvents
    : 0;
  const uniqueReceivers  = new Set(allRecords.map((r) => r.receiver)).size;
  const maxReward        = Math.max(0, ...allRecords.map((r) => r.rewardAmount));
  const minReward        = allRecords.length > 0
    ? Math.min(...allRecords.map((r) => r.rewardAmount))
    : 0;
  const sorted = [...allRecords].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    totalDistributed: parseFloat(totalDistributed.toFixed(8)),
    totalEvents,
    avgActivityScore: parseFloat(avgScore.toFixed(4)),
    uniqueReceivers,
    maxReward,
    minReward,
    latestReward: sorted[0] ?? null,
  };
}

export async function getWalletDailyStatus(walletAddress: string) {
  const today = new Date().toISOString().slice(0, 10);
  const rows  = await db
    .select()
    .from(aiWalletDailyTable)
    .where(eq(aiWalletDailyTable.id, `${walletAddress}:${today}`));
  return rows[0]
    ? { totalReceived: rows[0].totalReceived, txCount: rows[0].txCount, date: today }
    : null;
}
