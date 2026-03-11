import { describe, it, expect } from "vitest";
import { computeWeightedPositions } from "./positions";

describe("computeWeightedPositions", () => {
  it("computes avg cost from a single buy", () => {
    const result = computeWeightedPositions([
      { instrumentId: 1, transactionType: "buy", quantity: 100, price: 10 },
    ]);
    expect(result).toEqual([
      { instrumentId: 1, quantity: 100, avgCostPerUnit: 10 },
    ]);
  });

  it("computes weighted average from multiple buys at different prices", () => {
    const result = computeWeightedPositions([
      { instrumentId: 1, transactionType: "buy", quantity: 50, price: 63.8 },
      { instrumentId: 1, transactionType: "buy", quantity: 10, price: 74.2542 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(60);
    // (50*63.8 + 10*74.2542) / 60 = 65.5424
    expect(result[0].avgCostPerUnit).toBeCloseTo(65.5424, 2);
  });

  it("uses price in instrument currency, not grossAmount", () => {
    // This is the SGLN.L bug scenario: price is in GBP, grossAmount would
    // be in EUR. We only pass price, so the result must be in GBP.
    const result = computeWeightedPositions([
      { instrumentId: 1, transactionType: "buy", quantity: 50, price: 63.8 },
      { instrumentId: 1, transactionType: "buy", quantity: 10, price: 74.2542 },
    ]);
    // If grossAmount (EUR) were used: (3651.274 + 857.708) / 60 = 75.15 (wrong)
    // Using price (GBP): (3190 + 742.542) / 60 = 65.54 (correct)
    expect(result[0].avgCostPerUnit).toBeCloseTo(65.54, 1);
    expect(result[0].avgCostPerUnit).not.toBeCloseTo(75.15, 1);
  });

  it("adjusts avg cost after partial sell", () => {
    const result = computeWeightedPositions([
      { instrumentId: 1, transactionType: "buy", quantity: 100, price: 10 },
      { instrumentId: 1, transactionType: "sell", quantity: 50, price: 15 },
    ]);
    expect(result).toEqual([
      { instrumentId: 1, quantity: 50, avgCostPerUnit: 10 },
    ]);
  });

  it("preserves avg cost after partial sell then new buy", () => {
    const result = computeWeightedPositions([
      { instrumentId: 1, transactionType: "buy", quantity: 100, price: 10 },
      { instrumentId: 1, transactionType: "sell", quantity: 50, price: 15 },
      { instrumentId: 1, transactionType: "buy", quantity: 50, price: 20 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(100);
    // remaining cost after sell: 500, new buy: 50*20=1000, total=1500/100=15
    expect(result[0].avgCostPerUnit).toBe(15);
  });

  it("excludes positions fully sold", () => {
    const result = computeWeightedPositions([
      { instrumentId: 1, transactionType: "buy", quantity: 100, price: 10 },
      { instrumentId: 1, transactionType: "sell", quantity: 100, price: 15 },
    ]);
    expect(result).toEqual([]);
  });

  it("handles multiple instruments independently", () => {
    const result = computeWeightedPositions([
      { instrumentId: 1, transactionType: "buy", quantity: 10, price: 100 },
      { instrumentId: 2, transactionType: "buy", quantity: 20, price: 50 },
    ]);
    expect(result).toHaveLength(2);
    expect(result.find((p) => p.instrumentId === 1)).toEqual({
      instrumentId: 1, quantity: 10, avgCostPerUnit: 100,
    });
    expect(result.find((p) => p.instrumentId === 2)).toEqual({
      instrumentId: 2, quantity: 20, avgCostPerUnit: 50,
    });
  });

  it("returns empty array for no trades", () => {
    expect(computeWeightedPositions([])).toEqual([]);
  });
});
