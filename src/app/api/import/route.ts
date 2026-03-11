import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { instruments, positions, prices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { lookupInstrument, searchByISIN, fetchPrices } from "@/lib/yahoo-finance";
import { refreshExchangeRates } from "@/lib/currencies";
import { recordSnapshots } from "@/lib/snapshots";

export interface ParsedPosition {
  isin?: string;
  ticker?: string;
  name: string;
  quantity: number;
  avgCostPerUnit: number;
  currency: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, positions: parsedPositions } = body as {
      accountId: number;
      positions: ParsedPosition[];
    };

    if (!accountId || !Array.isArray(parsedPositions)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await db.delete(positions).where(eq(positions.accountId, accountId));

    const newPositions = [];
    const errors: string[] = [];

    for (const parsed of parsedPositions) {
      let ticker: string | undefined = parsed.ticker?.toUpperCase();

      if (!ticker && parsed.isin) {
        console.log(`Searching for ticker by ISIN: ${parsed.isin} (${parsed.name})`);
        const resolvedTicker = await searchByISIN(parsed.isin);
        if (resolvedTicker) {
          ticker = resolvedTicker;
          console.log(`Found ticker ${ticker} for ISIN ${parsed.isin}`);
        } else {
          console.warn(`ISIN search returned no results for ${parsed.isin}`);
        }
      }

      if (!ticker) {
        const errorMsg = `Could not resolve ticker for ${parsed.name}${parsed.isin ? ` (ISIN: ${parsed.isin})` : ''}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        continue;
      }

      let instrument = await db.query.instruments.findFirst({
        where: eq(instruments.ticker, ticker),
      });

      if (!instrument) {
        console.log(`Instrument ${ticker} not in DB, looking up on Yahoo Finance`);
        const yahooInstrument = await lookupInstrument(ticker);

        if (!yahooInstrument) {
          const errorMsg = `Could not lookup instrument ${ticker} on Yahoo Finance`;
          console.error(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        const [newInstrument] = await db
          .insert(instruments)
          .values({
            ticker: yahooInstrument.ticker,
            name: yahooInstrument.name,
            type: yahooInstrument.type,
            currency: yahooInstrument.currency,
            exchange: yahooInstrument.exchange || null,
            isin: parsed.isin || null,
          })
          .returning();

        instrument = newInstrument;
        console.log(`Created new instrument: ${instrument.ticker} - ${instrument.name}`);
      }

      const [position] = await db
        .insert(positions)
        .values({
          accountId,
          instrumentId: instrument.id,
          quantity: parsed.quantity,
          avgCostPerUnit: parsed.avgCostPerUnit,
          importedAt: new Date().toISOString(),
        })
        .returning();

      newPositions.push(position);
    }

    if (newPositions.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          error: "Failed to import any positions",
          details: errors,
        },
        { status: 400 }
      );
    }

    const accountPositions = await db
      .select()
      .from(positions)
      .leftJoin(instruments, eq(positions.instrumentId, instruments.id))
      .where(eq(positions.accountId, accountId));

    const tickers = accountPositions
      .map((p) => p.instruments?.ticker)
      .filter((t): t is string => !!t);
    const currencies = accountPositions
      .map((p) => p.instruments?.currency)
      .filter((currency): currency is string => !!currency);

    if (tickers.length > 0) {
      await refreshExchangeRates(currencies);

      const priceMap = await fetchPrices(tickers);
      const now = new Date().toISOString();
      const priceUpdates = [];

      for (const [ticker, price] of priceMap.entries()) {
        const instrument = accountPositions.find(
          (p) => p.instruments?.ticker === ticker
        )?.instruments;
        if (!instrument) continue;

        priceUpdates.push({
          instrumentId: instrument.id,
          price,
          date: now,
          fetchedAt: now,
        });
      }

      if (priceUpdates.length > 0) {
        await db.insert(prices).values(priceUpdates);
      }
    }

    await recordSnapshots();

    return NextResponse.json({
      message: `Imported ${newPositions.length} positions, prix actualises${errors.length > 0 ? ` (${errors.length} failed)` : ''}`,
      count: newPositions.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error importing positions:", error);
    return NextResponse.json(
      { error: "Failed to import positions" },
      { status: 500 }
    );
  }
}
