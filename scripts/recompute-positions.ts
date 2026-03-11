/**
 * Script to recompute IBKR positions from transactions
 * Uses grossAmount for more accurate cost basis
 */

import { db } from "../src/db";
import { accounts, positions, transactions } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

async function recomputePositions(accountId: number, accountName: string): Promise<number> {
  console.log(`\n🔄 Recomputing positions for: ${accountName}`);

  const allTxns = await db
    .select()
    .from(transactions)
    .where(eq(transactions.accountId, accountId))
    .orderBy(transactions.date);

  const tradeTxns = allTxns.filter(
    (t) =>
      (t.transactionType === "buy" || t.transactionType === "sell") &&
      t.instrumentId !== null &&
      t.quantity !== null &&
      (t.price !== null || t.grossAmount !== null)
  );

  console.log(`  Found ${tradeTxns.length} trade transactions`);

  // Group by instrumentId and compute weighted-average positions
  const byInstrument = new Map<number, { quantity: number; totalCost: number }>();

  for (const txn of tradeTxns) {
    const instId = txn.instrumentId!;
    if (!byInstrument.has(instId)) {
      byInstrument.set(instId, { quantity: 0, totalCost: 0 });
    }
    const pos = byInstrument.get(instId)!;

    if (txn.transactionType === "buy") {
      // Prefer grossAmount (more accurate) over quantity * price
      const cost = txn.grossAmount !== null
        ? Math.abs(txn.grossAmount)
        : txn.quantity! * txn.price!;
      pos.totalCost += cost;
      pos.quantity += txn.quantity!;
    } else if (txn.transactionType === "sell") {
      if (pos.quantity > 0) {
        const ratio = txn.quantity! / pos.quantity;
        pos.totalCost -= ratio * pos.totalCost;
      }
      pos.quantity -= txn.quantity!;
    }
  }

  // Replace positions for this account
  await db.delete(positions).where(eq(positions.accountId, accountId));

  let count = 0;
  const now = new Date().toISOString();

  for (const [instrumentId, { quantity, totalCost }] of byInstrument) {
    if (quantity <= 0) continue;

    // Get instrument details for logging
    const instrument = await db.query.instruments.findFirst({
      where: (instruments, { eq }) => eq(instruments.id, instrumentId),
    });

    const avgCostPerUnit = totalCost / quantity;

    await db.insert(positions).values({
      accountId,
      instrumentId,
      quantity,
      avgCostPerUnit,
      importedAt: now,
    });

    console.log(`  ✓ ${instrument?.ticker || `ID ${instrumentId}`}: ${quantity} units @ ${avgCostPerUnit.toFixed(4)} ${instrument?.currency || ''}`);
    count++;
  }

  return count;
}

async function main() {
  console.log("🔍 Finding IBKR accounts...");

  const ibkrBroker = await db.query.brokers.findFirst({
    where: (brokers, { eq }) => eq(brokers.name, "IBKR"),
  });

  if (!ibkrBroker) {
    console.log("❌ No IBKR broker found in database");
    return;
  }

  const ibkrAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.brokerId, ibkrBroker.id));

  if (ibkrAccounts.length === 0) {
    console.log("❌ No IBKR accounts found");
    return;
  }

  console.log(`📊 Found ${ibkrAccounts.length} IBKR account(s)`);

  for (const account of ibkrAccounts) {
    const count = await recomputePositions(account.id, account.name);
    console.log(`  📊 ${count} positions computed`);
  }

  console.log("\n✅ Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
