import { NextResponse } from "next/server";
import { db } from "@/db";
import { instruments, prices, positions } from "@/db/schema";
import { fetchQuotes } from "@/lib/yahoo-finance";
import { refreshExchangeRates } from "@/lib/currencies";
import { recordSnapshots } from "@/lib/snapshots";
import { eq, inArray } from "drizzle-orm";

export async function POST() {
  try {
    // Get only instruments that have active positions
    const activePositions = await db
      .select({ instrumentId: positions.instrumentId })
      .from(positions);

    if (activePositions.length === 0) {
      return NextResponse.json({ message: "No positions to update", count: 0 });
    }

    const activeInstrumentIds = [...new Set(activePositions.map(p => p.instrumentId))];
    const allInstruments = await db
      .select()
      .from(instruments)
      .where(inArray(instruments.id, activeInstrumentIds));

    const currencies = allInstruments.map((instrument) => instrument.currency);
    await refreshExchangeRates(currencies);

    const tickers = allInstruments.map((i) => i.ticker);
    const quoteMap = await fetchQuotes(tickers);

    const now = new Date().toISOString();
    const updates = [];

    for (const [ticker, quote] of quoteMap.entries()) {
      const instrument = allInstruments.find((i) => i.ticker === ticker);
      if (!instrument) continue;

      updates.push({
        instrumentId: instrument.id,
        price: quote.price,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        date: now,
        fetchedAt: now,
      });
    }

    if (updates.length > 0) {
      await db.insert(prices).values(updates);
    }

    await recordSnapshots();

    return NextResponse.json({
      message: "Prices refreshed successfully",
      count: updates.length,
    });
  } catch (error) {
    console.error("Error refreshing prices:", error);
    return NextResponse.json(
      { error: "Failed to refresh prices" },
      { status: 500 }
    );
  }
}
