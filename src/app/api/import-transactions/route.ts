import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { instruments, positions, transactions, prices } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { lookupInstrument, searchBySymbolAndName, fetchPrices } from "@/lib/yahoo-finance";
import { recordSnapshots } from "@/lib/snapshots";
import type { ParsedTransaction } from "@/lib/csv-parsers/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, transactions: parsedTransactions } = body as {
      accountId: number;
      transactions: ParsedTransaction[];
    };

    if (!accountId || !Array.isArray(parsedTransactions)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch existing transactions for dedup
    const existingTxns = await db
      .select()
      .from(transactions)
      .where(eq(transactions.accountId, accountId));

    const existingKeys = new Set(
      existingTxns.map((t) => dedupKey(t))
    );

    // Resolve instruments for trade transactions and insert new ones
    const errors: string[] = [];
    let newCount = 0;

    for (const parsed of parsedTransactions) {
      const key = dedupKey({
        date: parsed.date,
        transactionType: parsed.transactionType,
        symbol: parsed.symbol,
        quantity: parsed.quantity,
        netAmount: parsed.netAmount,
      });

      if (existingKeys.has(key)) continue;

      let instrumentId: number | null = null;

      if (
        (parsed.transactionType === "buy" || parsed.transactionType === "sell") &&
        parsed.symbol
      ) {
        instrumentId = await resolveInstrumentId(parsed.symbol, parsed.description, parsed.priceCurrency, errors);
        if (instrumentId === null) continue;
      }

      // Normalize GBp (pence) prices to GBP (pounds)
      let price = parsed.price;
      if (price !== null && (parsed.priceCurrency === "GBp" || parsed.priceCurrency === "GBX")) {
        price = price / 100;
      }

      await db.insert(transactions).values({
        accountId,
        instrumentId,
        date: parsed.date,
        transactionType: parsed.transactionType,
        symbol: parsed.symbol,
        description: parsed.description,
        quantity: parsed.quantity,
        price,
        priceCurrency: parsed.priceCurrency === "GBp" || parsed.priceCurrency === "GBX" ? "GBP" : parsed.priceCurrency,
        grossAmount: parsed.grossAmount,
        commission: parsed.commission,
        netAmount: parsed.netAmount,
        importedAt: new Date().toISOString(),
      });

      existingKeys.add(key);
      newCount++;
    }

    // Recompute positions from all trade transactions
    const positionsCount = await recomputePositions(accountId);

    const accountPositions = await db
      .select()
      .from(positions)
      .leftJoin(instruments, eq(positions.instrumentId, instruments.id))
      .where(eq(positions.accountId, accountId));

    const instrumentIds = accountPositions
      .map((p) => p.instruments?.id)
      .filter((id): id is number => !!id);

    if (instrumentIds.length > 0) {
      const allInstruments = await db
        .select()
        .from(instruments)
        .where(inArray(instruments.id, instrumentIds));

      const tickers = allInstruments.map((i) => i.ticker);
      const priceMap = await fetchPrices(tickers);
      const now = new Date().toISOString();
      const priceUpdates = [];

      for (const [ticker, price] of priceMap.entries()) {
        const instrument = allInstruments.find((i) => i.ticker === ticker);
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

    if (newCount === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: "Failed to import any transactions", details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `${newCount} nouvelles transactions importées, ${positionsCount} positions calculées, prix actualises${errors.length > 0 ? ` (${errors.length} erreurs)` : ""}`,
      newTransactionsCount: newCount,
      positionsCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error importing transactions:", error);
    return NextResponse.json(
      { error: "Failed to import transactions" },
      { status: 500 }
    );
  }
}

function dedupKey(t: {
  date: string;
  transactionType: string;
  symbol: string | null;
  quantity: number | null;
  netAmount: number;
}): string {
  return `${t.date}|${t.transactionType}|${t.symbol ?? ""}|${t.quantity ?? ""}|${t.netAmount}`;
}

async function resolveInstrumentId(
  symbol: string,
  description: string,
  currency: string | null,
  errors: string[]
): Promise<number | null> {
  // First check if we already have this instrument by ticker (exact or with common suffixes)
  let instrument = await db.query.instruments.findFirst({
    where: eq(instruments.ticker, symbol.toUpperCase()),
  });

  if (instrument) return instrument.id;

  // Use search-based resolution (name + currency hint + suffix probing)
  console.log(`Instrument ${symbol} not in DB, searching by name and symbol`);
  const resolvedTicker = await searchBySymbolAndName(symbol, description, currency);

  if (resolvedTicker) {
    // Check if this resolved ticker already exists in DB
    instrument = await db.query.instruments.findFirst({
      where: eq(instruments.ticker, resolvedTicker),
    });

    if (instrument) return instrument.id;

    // Lookup full instrument details from Yahoo Finance
    const yahooInstrument = await lookupInstrument(resolvedTicker);

    if (yahooInstrument) {
      // Double-check the resolved ticker didn't map to yet another symbol
      instrument = await db.query.instruments.findFirst({
        where: eq(instruments.ticker, yahooInstrument.ticker),
      });

      if (instrument) return instrument.id;

      const [newInstrument] = await db
        .insert(instruments)
        .values({
          ticker: yahooInstrument.ticker,
          name: yahooInstrument.name,
          type: yahooInstrument.type,
          currency: yahooInstrument.currency,
          exchange: yahooInstrument.exchange || null,
        })
        .returning();

      console.log(`Created instrument: ${newInstrument.ticker} - ${newInstrument.name}`);
      return newInstrument.id;
    }
  }

  const errorMsg = `Could not resolve instrument ${symbol} ("${description}")`;
  console.error(errorMsg);
  errors.push(errorMsg);
  return null;
}

async function recomputePositions(accountId: number): Promise<number> {
  // Get all trade transactions for this account
  const allTxns = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
      )
    )
    .orderBy(transactions.date);

  const tradeTxns = allTxns.filter(
    (t) =>
      (t.transactionType === "buy" || t.transactionType === "sell") &&
      t.instrumentId !== null &&
      t.quantity !== null &&
      (t.price !== null || t.grossAmount !== null)
  );

  // Group by instrumentId and compute weighted-average positions
  const byInstrument = new Map<number, { quantity: number; totalCost: number }>();

  for (const txn of tradeTxns) {
    const instId = txn.instrumentId!;
    if (!byInstrument.has(instId)) {
      byInstrument.set(instId, { quantity: 0, totalCost: 0 });
    }
    const pos = byInstrument.get(instId)!;

    const absQty = Math.abs(txn.quantity!);

    if (txn.transactionType === "buy") {
      // Prefer grossAmount (more accurate) over quantity * price
      const cost = txn.grossAmount !== null
        ? Math.abs(txn.grossAmount)
        : absQty * txn.price!;
      pos.totalCost += cost;
      pos.quantity += absQty;
    } else if (txn.transactionType === "sell") {
      if (pos.quantity > 0) {
        const ratio = absQty / pos.quantity;
        pos.totalCost -= ratio * pos.totalCost;
      }
      pos.quantity -= absQty;
    }
  }

  // Replace positions for this account
  await db.delete(positions).where(eq(positions.accountId, accountId));

  let count = 0;
  const now = new Date().toISOString();

  for (const [instrumentId, { quantity, totalCost }] of byInstrument) {
    if (quantity <= 0) continue;

    await db.insert(positions).values({
      accountId,
      instrumentId,
      quantity,
      avgCostPerUnit: totalCost / quantity,
      importedAt: now,
    });

    count++;
  }

  return count;
}
