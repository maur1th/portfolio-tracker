/**
 * Migration script: Convert GBp (pence) to GBP (pounds)
 * 
 * Yahoo Finance returns UK prices in pence (GBp) but we want to normalize
 * everything to the base currency unit (GBP = pounds).
 * 
 * This script:
 * 1. Finds all instruments with GBp currency
 * 2. Updates their currency to GBP
 * 3. Divides all prices by 100
 * 4. Divides all position avgCostPerUnit by 100
 * 5. Divides all transaction prices by 100 (if price_currency is GBp/GBX)
 */

import { db } from "../src/db";
import { instruments, positions, prices, transactions } from "../src/db/schema";
import { eq, or } from "drizzle-orm";

async function main() {
  console.log("🔍 Looking for GBp/GBX instruments and transactions...");

  const gbpInstruments = await db
    .select()
    .from(instruments)
    .where(eq(instruments.currency, "GBp"));

  if (gbpInstruments.length === 0) {
    console.log("✅ No GBp instruments found.");
  } else {
    console.log(`📊 Found ${gbpInstruments.length} instruments with GBp currency:`);
    for (const inst of gbpInstruments) {
      console.log(`  - ${inst.ticker} (${inst.name})`);
    }

    for (const inst of gbpInstruments) {
      console.log(`\n🔧 Processing ${inst.ticker}...`);

      // 1. Update instrument currency
      await db
        .update(instruments)
        .set({ currency: "GBP" })
        .where(eq(instruments.id, inst.id));
      console.log(`  ✓ Updated currency: GBp → GBP`);

      // 2. Update all prices (divide by 100)
      const instrumentPrices = await db
        .select()
        .from(prices)
        .where(eq(prices.instrumentId, inst.id));

      if (instrumentPrices.length > 0) {
        for (const price of instrumentPrices) {
          await db
            .update(prices)
            .set({ price: price.price / 100 })
            .where(eq(prices.id, price.id));
        }
        console.log(`  ✓ Updated ${instrumentPrices.length} prices (÷ 100)`);
      }

      // 3. Update all positions (divide avgCostPerUnit by 100)
      const instrumentPositions = await db
        .select()
        .from(positions)
        .where(eq(positions.instrumentId, inst.id));

      if (instrumentPositions.length > 0) {
        for (const position of instrumentPositions) {
          await db
            .update(positions)
            .set({ avgCostPerUnit: position.avgCostPerUnit / 100 })
            .where(eq(positions.id, position.id));
        }
        console.log(`  ✓ Updated ${instrumentPositions.length} positions (PRU ÷ 100)`);
      }
    }
  }

  // 4. Fix transactions with GBp/GBX price currency
  console.log("\n🔍 Looking for transactions with GBp/GBX prices...");
  const gbpTransactions = await db
    .select()
    .from(transactions)
    .where(
      or(
        eq(transactions.priceCurrency, "GBp"),
        eq(transactions.priceCurrency, "GBX")
      )
    );

  if (gbpTransactions.length === 0) {
    console.log("✅ No GBp/GBX transactions found.");
  } else {
    console.log(`📊 Found ${gbpTransactions.length} transactions with GBp/GBX prices`);

    for (const txn of gbpTransactions) {
      if (txn.price !== null) {
        await db
          .update(transactions)
          .set({
            price: txn.price / 100,
            priceCurrency: "GBP",
          })
          .where(eq(transactions.id, txn.id));
      } else {
        await db
          .update(transactions)
          .set({ priceCurrency: "GBP" })
          .where(eq(transactions.id, txn.id));
      }
    }
    console.log(`  ✓ Updated ${gbpTransactions.length} transactions (price ÷ 100, currency → GBP)`);
  }

  console.log("\n✅ Migration complete!");
  console.log("\n⚠️  Note: After this migration, you may want to refresh prices and/or re-import IBKR transactions.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
