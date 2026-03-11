import { NextResponse } from "next/server";
import { db } from "@/db";
import { etfCountryWeights, instruments, positions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchCountryWeights } from "@/lib/msci";
import { classifyInstrument } from "@/lib/exposure";

export async function GET() {
  const weights = db.select().from(etfCountryWeights).all();
  return NextResponse.json(weights);
}

export async function POST() {
  // Find all instruments classified as "Monde" that have positions
  const allPositions = db
    .select({
      instrumentId: instruments.id,
      name: instruments.name,
      ticker: instruments.ticker,
      type: instruments.type,
      currency: instruments.currency,
      exchange: instruments.exchange,
    })
    .from(positions)
    .innerJoin(instruments, eq(positions.instrumentId, instruments.id))
    .all();

  // Deduplicate by instrumentId
  const uniqueInstruments = new Map<number, (typeof allPositions)[number]>();
  for (const p of allPositions) {
    uniqueInstruments.set(p.instrumentId, p);
  }

  const worldEtfs = Array.from(uniqueInstruments.values()).filter((inst) => {
    const classification = classifyInstrument({
      name: inst.name,
      ticker: inst.ticker,
      type: inst.type as "stock" | "etf" | "bond" | "fund",
      exchange: inst.exchange,
    });
    return classification.geography === "Monde";
  });

  const results: Array<{
    instrumentId: number;
    name: string;
    countriesCount: number;
    error?: string;
  }> = [];

  const now = new Date().toISOString();

  for (const etf of worldEtfs) {
    try {
      const weights = await fetchCountryWeights(etf.name);

      if (!weights) {
        results.push({
          instrumentId: etf.instrumentId,
          name: etf.name,
          countriesCount: 0,
          error: `No MSCI factsheet matched for "${etf.name}"`,
        });
        continue;
      }

      db.transaction((tx) => {
        tx.delete(etfCountryWeights)
          .where(eq(etfCountryWeights.instrumentId, etf.instrumentId))
          .run();

        for (const { country, weight } of weights) {
          tx.insert(etfCountryWeights)
            .values({
              instrumentId: etf.instrumentId,
              country,
              weight,
              fetchedAt: now,
            })
            .run();
        }
      });

      results.push({
        instrumentId: etf.instrumentId,
        name: etf.name,
        countriesCount: weights.length,
      });
    } catch (err) {
      results.push({
        instrumentId: etf.instrumentId,
        name: etf.name,
        countriesCount: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ updated: results });
}
