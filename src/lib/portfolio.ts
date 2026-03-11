import { db } from "@/db";
import { positions, instruments, accounts, brokers, prices } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { convertToEUR } from "./currencies";
import type { PortfolioPosition } from "@/types";

export async function getPortfolioPositions(): Promise<PortfolioPosition[]> {
  const result = await db
    .select({
      position: positions,
      instrument: instruments,
      account: accounts,
      broker: brokers,
      price: {
        price: prices.price,
      },
    })
    .from(positions)
    .leftJoin(instruments, eq(positions.instrumentId, instruments.id))
    .leftJoin(accounts, eq(positions.accountId, accounts.id))
    .leftJoin(brokers, eq(accounts.brokerId, brokers.id))
    .leftJoin(
      prices,
      and(
        eq(prices.instrumentId, instruments.id),
        sql`${prices.id} IN (
          SELECT id FROM ${prices} p2 
          WHERE p2.instrument_id = ${instruments.id} 
          ORDER BY p2.fetched_at DESC 
          LIMIT 1
        )`
      )
    );

  const portfolioPositions: PortfolioPosition[] = [];

  for (const row of result) {
    if (!row.instrument || !row.account || !row.broker) continue;

    const currency = row.instrument.currency;
    const rawPrice = row.price?.price || null;
    const rawAvgCost = row.position.avgCostPerUnit;
    const rawTotalCost = row.position.quantity * rawAvgCost;
    const rawTotalValue = rawPrice
      ? row.position.quantity * rawPrice
      : rawTotalCost;

    const currentPrice = rawPrice !== null ? await convertToEUR(rawPrice, currency) : null;
    const avgCostEUR = await convertToEUR(rawAvgCost, currency);
    const totalCost = row.position.quantity * avgCostEUR;
    const totalValue = currentPrice !== null
      ? row.position.quantity * currentPrice
      : totalCost;
    const gainLoss = totalValue - totalCost;
    const gainLossPercent = totalCost > 0 ? gainLoss / totalCost : 0;

    portfolioPositions.push({
      position: { ...row.position, avgCostPerUnit: avgCostEUR },
      instrument: row.instrument,
      account: row.account,
      broker: row.broker,
      currentPrice,
      totalValue,
      totalCost,
      gainLoss,
      gainLossPercent,
    });
  }

  return portfolioPositions;
}

export async function getAccountPositions(
  accountId: number
): Promise<PortfolioPosition[]> {
  const allPositions = await getPortfolioPositions();
  return allPositions.filter((p) => p.position.accountId === accountId);
}

export interface AccountSummary {
  account: {
    id: number;
    name: string;
    type: "PEA" | "CTO";
    currency: string;
  };
  broker: {
    id: number;
    name: string;
  };
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
  positionCount: number;
}

export async function getAccountSummaries(): Promise<AccountSummary[]> {
  const portfolioPositions = await getPortfolioPositions();
  const accountMap = new Map<number, AccountSummary>();

  for (const p of portfolioPositions) {
    let summary = accountMap.get(p.account.id);

    if (!summary) {
      summary = {
        account: p.account,
        broker: p.broker,
        totalValue: 0,
        totalCost: 0,
        gainLoss: 0,
        gainLossPercent: 0,
        positionCount: 0,
      };
      accountMap.set(p.account.id, summary);
    }

    summary.totalValue += p.totalValue;
    summary.totalCost += p.totalCost;
    summary.positionCount++;
  }

  for (const summary of accountMap.values()) {
    summary.gainLoss = summary.totalValue - summary.totalCost;
    summary.gainLossPercent =
      summary.totalCost > 0 ? summary.gainLoss / summary.totalCost : 0;
  }

  return Array.from(accountMap.values());
}

export async function getLatestPrice(
  instrumentId: number
): Promise<number | null> {
  const result = await db
    .select({ price: prices.price })
    .from(prices)
    .where(eq(prices.instrumentId, instrumentId))
    .orderBy(desc(prices.fetchedAt))
    .limit(1);

  return result[0]?.price || null;
}
