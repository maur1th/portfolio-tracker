import Papa from "papaparse";
import type { ParsedTransaction, ParsedPosition } from "./types";

const TRANSACTION_TYPE_MAP: Record<string, string> = {
  "Buy": "buy",
  "Sell": "sell",
  "Deposit": "deposit",
  "Withdrawal": "withdrawal",
  "Credit Interest": "credit_interest",
  "Foreign Tax Withholding": "foreign_tax",
  "Forex Trade Component": "forex",
  "Dividend": "dividend",
};

function normalizeTransactionType(raw: string): string {
  return TRANSACTION_TYPE_MAP[raw] || raw.toLowerCase().replace(/\s+/g, "_");
}

function parseValue(val: string | undefined): string | null {
  if (!val || val.trim() === "-" || val.trim() === "") return null;
  return val.trim();
}

function parseNumber(val: string | undefined): number | null {
  const cleaned = parseValue(val);
  if (cleaned === null) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function parseIBKRTransactions(csvContent: string): ParsedTransaction[] {
  const result = Papa.parse<string[]>(csvContent, {
    header: false,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    console.error("CSV parsing errors:", result.errors);
  }

  // Find the header row to get column mapping
  const headerRow = result.data.find(
    (row) => row[0] === "Transaction History" && row[1] === "Header"
  );

  if (!headerRow) {
    throw new Error("Could not find Transaction History header row in CSV");
  }

  // Build column index map (columns start at index 2)
  const colMap: Record<string, number> = {};
  for (let i = 2; i < headerRow.length; i++) {
    colMap[headerRow[i].trim()] = i;
  }

  const dataRows = result.data.filter(
    (row) => row[0] === "Transaction History" && row[1] === "Data"
  );

  const transactions: ParsedTransaction[] = [];

  for (const row of dataRows) {
    const date = row[colMap["Date"]]?.trim();
    const description = row[colMap["Description"]]?.trim();
    const rawType = row[colMap["Transaction Type"]]?.trim();

    if (!date || !description || !rawType) {
      console.warn("Skipping incomplete transaction row:", row);
      continue;
    }

    const transactionType = normalizeTransactionType(rawType);
    const symbol = parseValue(row[colMap["Symbol"]]);
    const quantity = parseNumber(row[colMap["Quantity"]]);
    const price = parseNumber(row[colMap["Price"]]);
    const priceCurrency = parseValue(row[colMap["Price Currency"]]);
    const grossAmount = parseNumber(row[colMap["Gross Amount"]]);
    const commission = parseNumber(row[colMap["Commission"]]);
    const netAmount = parseNumber(row[colMap["Net Amount"]]);

    if (netAmount === null) {
      console.warn("Skipping row with no net amount:", row);
      continue;
    }

    transactions.push({
      date,
      description,
      transactionType,
      symbol,
      quantity,
      price,
      priceCurrency,
      grossAmount,
      commission,
      netAmount,
    });
  }

  return transactions;
}

export function computePositionsFromTransactions(
  txns: ParsedTransaction[]
): ParsedPosition[] {
  const tradeTxns = txns.filter(
    (t) => (t.transactionType === "buy" || t.transactionType === "sell") &&
      t.symbol !== null &&
      t.quantity !== null &&
      t.price !== null
  );

  // Sort chronologically (oldest first)
  tradeTxns.sort((a, b) => a.date.localeCompare(b.date));

  // Group by symbol
  const bySymbol = new Map<
    string,
    { txns: ParsedTransaction[]; lastName: string; lastCurrency: string }
  >();

  for (const txn of tradeTxns) {
    const sym = txn.symbol!;
    if (!bySymbol.has(sym)) {
      bySymbol.set(sym, { txns: [], lastName: txn.description, lastCurrency: txn.priceCurrency || "EUR" });
    }
    const entry = bySymbol.get(sym)!;
    entry.txns.push(txn);
    entry.lastName = txn.description;
    if (txn.priceCurrency) entry.lastCurrency = txn.priceCurrency;
  }

  const positions: ParsedPosition[] = [];

  for (const [symbol, { txns: symbolTxns, lastName, lastCurrency }] of bySymbol) {
    let quantity = 0;
    let totalCost = 0;

    for (const txn of symbolTxns) {
      const qty = Math.abs(txn.quantity!);
      const price = txn.price!;

      if (txn.transactionType === "buy") {
        totalCost += qty * price;
        quantity += qty;
      } else if (txn.transactionType === "sell") {
        if (quantity > 0) {
          const ratio = qty / quantity;
          totalCost -= ratio * totalCost;
        }
        quantity -= qty;
      }
    }

    if (quantity <= 0) continue;

    positions.push({
      ticker: symbol,
      name: lastName,
      quantity,
      avgCostPerUnit: totalCost / quantity,
      currency: lastCurrency,
    });
  }

  return positions;
}
