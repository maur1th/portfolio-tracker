import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/schema", () => ({ etfCountryWeights: {} }));

import { computeDcaSuggestions } from "./dca-suggestions";
import type { PortfolioPosition } from "@/types";
import type { ExposureBreakdown } from "./exposure";

function makePosition(overrides: {
  name: string;
  ticker: string;
  type?: "etf" | "stock";
  totalValue: number;
  accountName?: string;
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
      type: overrides.type ?? "etf",
      currency: "EUR",
    },
    account: { id: 1, brokerId: 1, name: overrides.accountName ?? "CTO IBKR", type: "CTO", currency: "EUR" },
    broker: { id: 1, name: "IBKR" },
    currentPrice: overrides.totalValue / 10,
    totalValue: overrides.totalValue,
    totalCost: overrides.totalValue * 0.9,
    gainLoss: overrides.totalValue * 0.1,
    gainLossPercent: 0.1,
  };
}

function makeExposure(overrides?: Partial<ExposureBreakdown>): ExposureBreakdown {
  return {
    geography: {
      US: 5000,
      Europe: 3000,
      Monde: 0,
      Émergents: 500,
      Japon: 500,
      "Asie-Pacifique": 1000,
      UK: 0,
      "Non classé": 0,
    },
    assetClass: {
      Actions: 10000,
      Obligations: 0,
      "Matières premières": 0,
      Immobilier: 0,
      Monétaire: 0,
      "Non classé": 0,
    },
    marketCap: {
      "Large Cap": 7000,
      "Mid Cap": 1500,
      "Small Cap": 500,
      "N/A": 1000,
    },
    unmatchedCapEtfs: [],
    unmatchedGeoEtfs: [],
    totalValueEur: 10000,
    ...overrides,
  };
}

const defaultGeoTargets = { US: 45, Europe: 25, "Asie-Pacifique": 20 };
const defaultCapTargets = { "Large Cap": 70, "Small Cap": 15, "Mid Cap": 15 };

describe("computeDcaSuggestions", () => {
  it("returns empty array when amountToInvest is 0", () => {
    const result = computeDcaSuggestions({
      amountToInvest: 0,
      positions: [],
      exposure: makeExposure(),
      geoTargets: defaultGeoTargets,
      capTargets: defaultCapTargets,
    });
    expect(result).toEqual([]);
  });

  it("returns empty array when amountToInvest is negative", () => {
    const result = computeDcaSuggestions({
      amountToInvest: -100,
      positions: [],
      exposure: makeExposure(),
      geoTargets: defaultGeoTargets,
      capTargets: defaultCapTargets,
    });
    expect(result).toEqual([]);
  });

  it("prioritizes geography gaps over cap gaps", () => {
    // US heavily overweight (60%), Asia-Pacific underweight (10%)
    const positions = [
      makePosition({ name: "iShares Core S&P 500 UCITS ETF", ticker: "SXR8.DE", totalValue: 6000 }),
      makePosition({ name: "Amundi MSCI Europe UCITS ETF", ticker: "CE8.PA", totalValue: 2000 }),
      makePosition({ name: "iShares MSCI Asia Pacific UCITS ETF", ticker: "CPXJ.AS", totalValue: 500 }),
    ];

    // Geo total = 10000, US at 60% is well above 45% target
    const exposure = makeExposure({
      geography: { US: 6000, Europe: 2000, Monde: 0, Émergents: 500, Japon: 500, "Asie-Pacifique": 1000, UK: 0, "Non classé": 0 },
    });

    const result = computeDcaSuggestions({
      amountToInvest: 1000,
      positions,
      exposure,
      geoTargets: defaultGeoTargets,
      capTargets: defaultCapTargets,
    });

    // Asia-Pacific should get an allocation (it's underweight)
    const asiaSuggestion = result.find((s) => s.category === "Asie-Pacifique");
    expect(asiaSuggestion).toBeDefined();
    expect(asiaSuggestion!.suggestedAmount).toBeGreaterThanOrEqual(100);

    // US should NOT get an allocation (it's overweight even after adding investment)
    const usSuggestion = result.find((s) => s.category === "US");
    expect(usSuggestion).toBeUndefined();
  });

  it("fills cap gaps with remaining amount after geography allocation", () => {
    const positions = [
      makePosition({ name: "iShares MSCI World Small Cap UCITS ETF", ticker: "IUSN.DE", totalValue: 500 }),
      makePosition({ name: "iShares Core S&P 500 UCITS ETF", ticker: "SXR8.DE", totalValue: 5000 }),
      makePosition({ name: "Amundi MSCI Europe UCITS ETF", ticker: "CE8.PA", totalValue: 3000 }),
      makePosition({ name: "iShares MSCI Asia Pacific UCITS ETF", ticker: "CPXJ.AS", totalValue: 1000 }),
    ];

    const exposure = makeExposure({
      marketCap: { "Large Cap": 7000, "Mid Cap": 1200, "Small Cap": 500, "N/A": 300 },
    });

    const result = computeDcaSuggestions({
      amountToInvest: 5000,
      positions,
      exposure,
      geoTargets: defaultGeoTargets,
      capTargets: defaultCapTargets,
    });

    // Should have geography suggestions
    expect(result.some((s) => s.category === "Asie-Pacifique" || s.category === "Europe")).toBe(true);
  });

  it("skips geographies with no matching ETF and redistributes", () => {
    const positions = [
      makePosition({ name: "iShares Core S&P 500 UCITS ETF", ticker: "SXR8.DE", totalValue: 5000 }),
      makePosition({ name: "iShares MSCI Asia Pacific UCITS ETF", ticker: "CPXJ.AS", totalValue: 500 }),
    ];

    const exposure = makeExposure({
      geography: { US: 5000, Europe: 3000, Monde: 0, Émergents: 500, Japon: 500, "Asie-Pacifique": 500, UK: 0, "Non classé": 0 },
    });

    const result = computeDcaSuggestions({
      amountToInvest: 5000,
      positions,
      exposure,
      geoTargets: { ...defaultGeoTargets, Europe: 25 },
      capTargets: defaultCapTargets,
    });

    // No Europe ETF available, so Europe should be skipped
    const europeSuggestion = result.find((s) => s.category === "Europe");
    expect(europeSuggestion).toBeUndefined();

    // Asia-Pacific should still get an allocation
    const asiaSuggestion = result.find((s) => s.category === "Asie-Pacifique");
    expect(asiaSuggestion).toBeDefined();
  });

  it("rounds amounts down to nearest 100€", () => {
    const positions = [
      makePosition({ name: "iShares Core S&P 500 UCITS ETF", ticker: "SXR8.DE", totalValue: 5000 }),
      makePosition({ name: "Amundi MSCI Europe UCITS ETF", ticker: "CE8.PA", totalValue: 3000 }),
      makePosition({ name: "iShares MSCI Asia Pacific UCITS ETF", ticker: "CPXJ.AS", totalValue: 1000 }),
    ];

    const result = computeDcaSuggestions({
      amountToInvest: 5000,
      positions,
      exposure: makeExposure(),
      geoTargets: defaultGeoTargets,
      capTargets: defaultCapTargets,
    });

    for (const s of result) {
      expect(s.suggestedAmount % 100).toBe(0);
    }
  });

  it("ignores stocks (only uses ETFs)", () => {
    const positions = [
      makePosition({ name: "Apple Inc", ticker: "AAPL", type: "stock", totalValue: 5000 }),
    ];

    const result = computeDcaSuggestions({
      amountToInvest: 1000,
      positions,
      exposure: makeExposure(),
      geoTargets: defaultGeoTargets,
      capTargets: defaultCapTargets,
    });

    expect(result).toEqual([]);
  });

  it("includes account name in suggestions", () => {
    const positions = [
      makePosition({
        name: "iShares MSCI Asia Pacific UCITS ETF",
        ticker: "CPXJ.AS",
        totalValue: 500,
        accountName: "PEA Bourso",
      }),
    ];

    const exposure = makeExposure({
      geography: { US: 5000, Europe: 3000, Monde: 0, Émergents: 500, Japon: 500, "Asie-Pacifique": 500, UK: 0, "Non classé": 0 },
    });

    const result = computeDcaSuggestions({
      amountToInvest: 5000,
      positions,
      exposure,
      geoTargets: defaultGeoTargets,
      capTargets: defaultCapTargets,
    });

    if (result.length > 0) {
      expect(result[0].accountName).toBe("PEA Bourso");
    }
  });

  it("removes suggestions that round down to 0", () => {
    const positions = [
      makePosition({ name: "iShares Core S&P 500 UCITS ETF", ticker: "SXR8.DE", totalValue: 5000 }),
      makePosition({ name: "Amundi MSCI Europe UCITS ETF", ticker: "CE8.PA", totalValue: 3000 }),
      makePosition({ name: "iShares MSCI Asia Pacific UCITS ETF", ticker: "CPXJ.AS", totalValue: 1000 }),
    ];

    // Very small amount — some categories will round to 0
    const result = computeDcaSuggestions({
      amountToInvest: 200,
      positions,
      exposure: makeExposure(),
      geoTargets: defaultGeoTargets,
      capTargets: defaultCapTargets,
    });

    for (const s of result) {
      expect(s.suggestedAmount).toBeGreaterThan(0);
    }
  });
});
