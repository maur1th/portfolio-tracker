import { describe, it, expect } from "vitest";
import {
  computeDrawdownFromHigh,
  selectDipSignals,
  DEFAULT_DIP_THRESHOLD,
} from "./dip-signals";
import type { PortfolioPosition } from "@/types";

describe("computeDrawdownFromHigh", () => {
  it("returns a negative fraction when below the high", () => {
    expect(computeDrawdownFromHigh(90, 100)).toBeCloseTo(-0.1);
    expect(computeDrawdownFromHigh(75, 100)).toBeCloseTo(-0.25);
  });

  it("clamps to 0 at or above the high", () => {
    expect(computeDrawdownFromHigh(100, 100)).toBe(0);
    expect(computeDrawdownFromHigh(110, 100)).toBe(0);
  });

  it("returns null when there is no usable reference", () => {
    expect(computeDrawdownFromHigh(null, 100)).toBeNull();
    expect(computeDrawdownFromHigh(90, null)).toBeNull();
    expect(computeDrawdownFromHigh(90, 0)).toBeNull();
  });

  it("is currency-agnostic (ratio cancels FX)", () => {
    // native EUR vs the same values scaled by an FX rate give equal drawdown
    expect(computeDrawdownFromHigh(90, 100)).toBeCloseTo(
      computeDrawdownFromHigh(90 * 1.08, 100 * 1.08) as number
    );
  });
});

function makePosition(overrides: {
  ticker: string;
  name: string;
  accountName?: string;
  drawdownFromHigh: number | null;
  totalValue?: number;
}): PortfolioPosition {
  return {
    position: {
      id: 1,
      accountId: 1,
      instrumentId: 1,
      quantity: 10,
      avgCostPerUnit: 100,
      importedAt: "2025-01-01",
    },
    instrument: {
      id: 1,
      name: overrides.name,
      ticker: overrides.ticker,
      type: "etf",
      currency: "EUR",
    },
    account: {
      id: 1,
      brokerId: 1,
      name: overrides.accountName ?? "IBKR CTO",
      type: "CTO",
      currency: "EUR",
    },
    broker: { id: 1, name: "IBKR" },
    currentPrice: 100,
    totalValue: overrides.totalValue ?? 1000,
    totalCost: 900,
    gainLoss: 100,
    gainLossPercent: 0.1,
    drawdownFromHigh: overrides.drawdownFromHigh,
  };
}

describe("selectDipSignals", () => {
  it("flags only positions at or beyond the threshold", () => {
    const positions = [
      makePosition({ ticker: "A", name: "Above high", drawdownFromHigh: 0 }),
      makePosition({ ticker: "B", name: "Small dip", drawdownFromHigh: -0.05 }),
      makePosition({ ticker: "C", name: "At threshold", drawdownFromHigh: -0.1 }),
      makePosition({ ticker: "D", name: "Deep dip", drawdownFromHigh: -0.22 }),
    ];

    const signals = selectDipSignals(positions, DEFAULT_DIP_THRESHOLD);

    expect(signals.map((s) => s.ticker)).toEqual(["D", "C"]);
  });

  it("sorts deepest drawdown first", () => {
    const positions = [
      makePosition({ ticker: "A", name: "A", drawdownFromHigh: -0.12 }),
      makePosition({ ticker: "B", name: "B", drawdownFromHigh: -0.31 }),
      makePosition({ ticker: "C", name: "C", drawdownFromHigh: -0.18 }),
    ];

    expect(selectDipSignals(positions).map((s) => s.ticker)).toEqual([
      "B",
      "C",
      "A",
    ]);
  });

  it("ignores positions without a drawdown reference", () => {
    const positions = [
      makePosition({ ticker: "A", name: "A", drawdownFromHigh: null }),
      makePosition({ ticker: "B", name: "B", drawdownFromHigh: -0.15 }),
    ];

    expect(selectDipSignals(positions).map((s) => s.ticker)).toEqual(["B"]);
  });

  it("respects a custom threshold", () => {
    const positions = [
      makePosition({ ticker: "A", name: "A", drawdownFromHigh: -0.06 }),
      makePosition({ ticker: "B", name: "B", drawdownFromHigh: -0.12 }),
    ];

    expect(selectDipSignals(positions, 0.05).map((s) => s.ticker)).toEqual([
      "B",
      "A",
    ]);
  });
});
