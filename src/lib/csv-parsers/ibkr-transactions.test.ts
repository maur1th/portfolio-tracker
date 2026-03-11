import { describe, it, expect } from "vitest";
import {
  parseIBKRTransactions,
  computePositionsFromTransactions,
} from "./ibkr-transactions";
import type { ParsedTransaction } from "./types";

describe("parseIBKRTransactions", () => {
  function makeCSV(dataRows: string[]): string {
    const header =
      "Transaction History,Header,Date,Description,Transaction Type,Symbol,Quantity,Price,Price Currency,Gross Amount,Commission,Net Amount";
    const rows = dataRows.map((r) => `Transaction History,Data,${r}`);
    return [header, ...rows].join("\n");
  }

  it("parses a buy transaction", () => {
    const csv = makeCSV([
      "2024-01-15,iShares MSCI World,Buy,IWDA,10,85.50,EUR,855.00,-1.50,853.50",
    ]);

    const result = parseIBKRTransactions(csv);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: "2024-01-15",
      description: "iShares MSCI World",
      transactionType: "buy",
      symbol: "IWDA",
      quantity: 10,
      price: 85.5,
      priceCurrency: "EUR",
      grossAmount: 855,
      commission: -1.5,
      netAmount: 853.5,
    });
  });

  it("parses a sell transaction", () => {
    const csv = makeCSV([
      "2024-02-01,AAPL Inc,Sell,AAPL,-5,180.00,USD,-900.00,-1.00,-901.00",
    ]);

    const result = parseIBKRTransactions(csv);
    expect(result).toHaveLength(1);
    expect(result[0].transactionType).toBe("sell");
    expect(result[0].quantity).toBe(-5);
  });

  it("normalizes transaction types", () => {
    const csv = makeCSV([
      "2024-01-01,Deposit,Deposit,-,-,-,-,-,-,1000.00",
      "2024-01-02,Dividend AAPL,Dividend,AAPL,-,-,USD,-,-,25.00",
    ]);

    const result = parseIBKRTransactions(csv);
    expect(result).toHaveLength(2);
    expect(result[0].transactionType).toBe("deposit");
    expect(result[1].transactionType).toBe("dividend");
  });

  it("handles dash values as null", () => {
    const csv = makeCSV([
      "2024-01-01,Deposit,Deposit,-,-,-,-,-,-,1000.00",
    ]);

    const result = parseIBKRTransactions(csv);
    expect(result[0].symbol).toBeNull();
    expect(result[0].quantity).toBeNull();
    expect(result[0].price).toBeNull();
  });

  it("skips rows without net amount", () => {
    const csv = makeCSV([
      "2024-01-01,Test,Buy,AAPL,10,100.00,USD,1000.00,-1.00,-",
    ]);

    const result = parseIBKRTransactions(csv);
    expect(result).toHaveLength(0);
  });

  it("throws if header row is missing", () => {
    const csv = "Some,Other,Format\ndata,row,here";
    expect(() => parseIBKRTransactions(csv)).toThrow(
      "Could not find Transaction History header row"
    );
  });

  it("parses multiple transactions", () => {
    const csv = makeCSV([
      "2024-01-15,IWDA,Buy,IWDA,10,85.50,EUR,855.00,-1.50,853.50",
      "2024-02-15,IWDA,Buy,IWDA,5,86.00,EUR,430.00,-1.50,428.50",
    ]);

    const result = parseIBKRTransactions(csv);
    expect(result).toHaveLength(2);
  });
});

describe("computePositionsFromTransactions", () => {
  it("computes position from a single buy", () => {
    const txns: ParsedTransaction[] = [
      {
        date: "2024-01-15",
        description: "iShares MSCI World",
        transactionType: "buy",
        symbol: "IWDA",
        quantity: 10,
        price: 85.5,
        priceCurrency: "EUR",
        grossAmount: 855,
        commission: -1.5,
        netAmount: 853.5,
      },
    ];

    const result = computePositionsFromTransactions(txns);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ticker: "IWDA",
      name: "iShares MSCI World",
      quantity: 10,
      avgCostPerUnit: 85.5,
      currency: "EUR",
    });
  });

  it("computes weighted average from multiple buys", () => {
    const txns: ParsedTransaction[] = [
      {
        date: "2024-01-15",
        description: "IWDA",
        transactionType: "buy",
        symbol: "IWDA",
        quantity: 10,
        price: 80,
        priceCurrency: "EUR",
        grossAmount: 800,
        commission: -1,
        netAmount: 799,
      },
      {
        date: "2024-02-15",
        description: "IWDA",
        transactionType: "buy",
        symbol: "IWDA",
        quantity: 10,
        price: 100,
        priceCurrency: "EUR",
        grossAmount: 1000,
        commission: -1,
        netAmount: 999,
      },
    ];

    const result = computePositionsFromTransactions(txns);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(20);
    expect(result[0].avgCostPerUnit).toBe(90); // (800+1000)/20
  });

  it("adjusts cost after partial sell", () => {
    const txns: ParsedTransaction[] = [
      {
        date: "2024-01-15",
        description: "AAPL",
        transactionType: "buy",
        symbol: "AAPL",
        quantity: 100,
        price: 150,
        priceCurrency: "USD",
        grossAmount: 15000,
        commission: -1,
        netAmount: 14999,
      },
      {
        date: "2024-02-15",
        description: "AAPL",
        transactionType: "sell",
        symbol: "AAPL",
        quantity: -50,
        price: 200,
        priceCurrency: "USD",
        grossAmount: -10000,
        commission: -1,
        netAmount: -10001,
      },
    ];

    const result = computePositionsFromTransactions(txns);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(50);
    expect(result[0].avgCostPerUnit).toBe(150); // avg cost unchanged by sell
  });

  it("excludes fully sold positions", () => {
    const txns: ParsedTransaction[] = [
      {
        date: "2024-01-15",
        description: "AAPL",
        transactionType: "buy",
        symbol: "AAPL",
        quantity: 100,
        price: 150,
        priceCurrency: "USD",
        grossAmount: 15000,
        commission: -1,
        netAmount: 14999,
      },
      {
        date: "2024-02-15",
        description: "AAPL",
        transactionType: "sell",
        symbol: "AAPL",
        quantity: -100,
        price: 200,
        priceCurrency: "USD",
        grossAmount: -20000,
        commission: -1,
        netAmount: -20001,
      },
    ];

    const result = computePositionsFromTransactions(txns);
    expect(result).toHaveLength(0);
  });

  it("ignores non-trade transactions", () => {
    const txns: ParsedTransaction[] = [
      {
        date: "2024-01-01",
        description: "Deposit",
        transactionType: "deposit",
        symbol: null,
        quantity: null,
        price: null,
        priceCurrency: null,
        grossAmount: null,
        commission: null,
        netAmount: 10000,
      },
      {
        date: "2024-01-15",
        description: "IWDA",
        transactionType: "buy",
        symbol: "IWDA",
        quantity: 10,
        price: 85,
        priceCurrency: "EUR",
        grossAmount: 850,
        commission: -1,
        netAmount: 849,
      },
    ];

    const result = computePositionsFromTransactions(txns);
    expect(result).toHaveLength(1);
    expect(result[0].ticker).toBe("IWDA");
  });

  it("handles multiple instruments independently", () => {
    const txns: ParsedTransaction[] = [
      {
        date: "2024-01-15",
        description: "IWDA",
        transactionType: "buy",
        symbol: "IWDA",
        quantity: 10,
        price: 85,
        priceCurrency: "EUR",
        grossAmount: 850,
        commission: -1,
        netAmount: 849,
      },
      {
        date: "2024-01-15",
        description: "AAPL",
        transactionType: "buy",
        symbol: "AAPL",
        quantity: 5,
        price: 180,
        priceCurrency: "USD",
        grossAmount: 900,
        commission: -1,
        netAmount: 899,
      },
    ];

    const result = computePositionsFromTransactions(txns);
    expect(result).toHaveLength(2);
    expect(result.find((p) => p.ticker === "IWDA")?.quantity).toBe(10);
    expect(result.find((p) => p.ticker === "AAPL")?.quantity).toBe(5);
  });

  it("returns empty array for no transactions", () => {
    expect(computePositionsFromTransactions([])).toEqual([]);
  });
});
