import { db } from "@/db";
import { vaConfig, positionSnapshots, positions, instruments } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { PortfolioPosition } from "@/types";

export interface VAConfig {
  id: number;
  startDate: string;
  monthlyIncrement: number;
  initialValue: number;
  createdAt: string;
}

export interface VACalculation {
  targetValue: number;
  currentValue: number;
  amountToInvest: number;
  monthsElapsed: number;
  onTrack: boolean;
}

export interface SnapshotTotal {
  date: string;
  totalValueEur: number;
  totalCostEur: number;
}

export async function getVAConfig(): Promise<VAConfig | null> {
  const result = await db
    .select()
    .from(vaConfig)
    .orderBy(desc(vaConfig.createdAt))
    .limit(1);

  return result[0] || null;
}

export async function saveVAConfig(
  startDate: string,
  monthlyIncrement: number,
  initialValue: number
): Promise<VAConfig> {
  const now = new Date().toISOString();

  await db.delete(vaConfig);

  const result = await db
    .insert(vaConfig)
    .values({
      startDate,
      monthlyIncrement,
      initialValue,
      createdAt: now,
    })
    .returning();

  return result[0];
}

export function calculateVA(
  config: VAConfig,
  currentValueEUR: number,
  snapshotHistory: SnapshotTotal[] = []
): VACalculation {
  const startDate = new Date(config.startDate);
  const now = new Date();

  const yearsDiff = now.getFullYear() - startDate.getFullYear();
  const monthsDiff = now.getMonth() - startDate.getMonth();
  const monthsElapsed = yearsDiff * 12 + monthsDiff;

  const baseValue = getPreviousMonthEndValue(config, snapshotHistory, now);
  const targetValue = baseValue + config.monthlyIncrement;
  const amountToInvest = Math.max(0, targetValue - currentValueEUR);
  const onTrack = currentValueEUR >= targetValue;

  return {
    targetValue,
    currentValue: currentValueEUR,
    amountToInvest,
    monthsElapsed,
    onTrack,
  };
}

// Returns the last snapshot value from the previous month, or initialValue if none exists
function getPreviousMonthEndValue(
  config: VAConfig,
  snapshots: SnapshotTotal[],
  referenceDate: Date
): number {
  const prevMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  const prevMonthSnapshots = snapshots
    .filter((s) => s.date.startsWith(prevMonthStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (prevMonthSnapshots.length > 0) {
    return prevMonthSnapshots[prevMonthSnapshots.length - 1].totalValueEur;
  }

  return config.initialValue;
}

// Compute the target for a given snapshot date (for history display)
export function computeTargetForDate(
  config: VAConfig,
  snapshotDate: string,
  allSnapshots: SnapshotTotal[]
): number {
  const date = new Date(snapshotDate);
  const baseValue = getPreviousMonthEndValue(config, allSnapshots, date);
  return baseValue + config.monthlyIncrement;
}

export async function getSnapshotTotals(): Promise<SnapshotTotal[]> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const cutoff = twelveMonthsAgo.toISOString().split("T")[0];

  const result = await db
    .select({
      date: positionSnapshots.snapshotDate,
      totalValueEur: sql<number>`SUM(${positionSnapshots.valueEur})`,
      totalCostEur: sql<number>`SUM(${positionSnapshots.costEur})`,
    })
    .from(positionSnapshots)
    .where(sql`${positionSnapshots.snapshotDate} >= ${cutoff}`)
    .groupBy(positionSnapshots.snapshotDate)
    .orderBy(positionSnapshots.snapshotDate);

  return result;
}

export async function getLatestSnapshotDate(): Promise<string | null> {
  const result = await db
    .select({ date: positionSnapshots.snapshotDate })
    .from(positionSnapshots)
    .orderBy(desc(positionSnapshots.snapshotDate))
    .limit(1);

  return result[0]?.date || null;
}

export async function detectContributions(
  fromDate: string,
  toDate: string
): Promise<number> {
  const fromResult = await db
    .select({
      totalCost: sql<number>`SUM(${positionSnapshots.costEur})`,
    })
    .from(positionSnapshots)
    .where(eq(positionSnapshots.snapshotDate, fromDate));

  const toResult = await db
    .select({
      totalCost: sql<number>`SUM(${positionSnapshots.costEur})`,
    })
    .from(positionSnapshots)
    .where(eq(positionSnapshots.snapshotDate, toDate));

  const fromCost = fromResult[0]?.totalCost || 0;
  const toCost = toResult[0]?.totalCost || 0;

  return Math.max(0, toCost - fromCost);
}

export async function computePortfolioTotalEUR(
  positions: PortfolioPosition[]
): Promise<{ totalValueEur: number; totalCostEur: number }> {
  let totalValueEur = 0;
  let totalCostEur = 0;

  for (const p of positions) {
    // PortfolioPosition totals are already normalized to EUR upstream.
    totalValueEur += p.totalValue;
    totalCostEur += p.totalCost;
  }

  return { totalValueEur, totalCostEur };
}
