import { db } from "@/db";
import { positionSnapshots, positions, instruments, prices } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { convertToEUR } from "./currencies";

export async function recordSnapshots(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  await db
    .delete(positionSnapshots)
    .where(eq(positionSnapshots.snapshotDate, today));

  const allPositions = await db
    .select({
      position: positions,
      instrument: instruments,
      price: {
        price: prices.price,
      },
    })
    .from(positions)
    .leftJoin(instruments, eq(positions.instrumentId, instruments.id))
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

  const snapshots = [];

  for (const row of allPositions) {
    if (!row.instrument || !row.price?.price) continue;

    const price = row.price.price;
    const quantity = row.position.quantity;
    const avgCostPerUnit = row.position.avgCostPerUnit;
    const currency = row.instrument.currency;

    const valueInNativeCurrency = quantity * price;
    const costInNativeCurrency = quantity * avgCostPerUnit;

    let valueEur: number;
    let costEur: number;

    if (currency === "EUR") {
      valueEur = valueInNativeCurrency;
      costEur = costInNativeCurrency;
    } else {
      valueEur = await convertToEUR(valueInNativeCurrency, currency);
      costEur = await convertToEUR(costInNativeCurrency, currency);
    }

    snapshots.push({
      accountId: row.position.accountId,
      instrumentId: row.position.instrumentId,
      quantity,
      avgCostPerUnit,
      price,
      valueEur,
      costEur,
      snapshotDate: today,
      createdAt: now,
    });
  }

  if (snapshots.length > 0) {
    await db.insert(positionSnapshots).values(snapshots);
  }

  return snapshots.length;
}
