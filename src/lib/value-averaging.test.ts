import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/schema", () => ({
  vaConfig: {},
  positionSnapshots: {},
  positions: {},
  instruments: {},
}));

import { calculateVA, computePortfolioTotalEUR, computeTargetForDate } from "./value-averaging";
import type { VAConfig, SnapshotTotal } from "./value-averaging";
import type { PortfolioPosition } from "@/types";

const baseConfig: VAConfig = {
  id: 1,
  startDate: "2024-01-01",
  monthlyIncrement: 1000,
  initialValue: 50000,
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("calculateVA", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses initialValue when no snapshots exist", () => {
    vi.setSystemTime(new Date("2024-03-15"));

    const result = calculateVA(baseConfig, 51500);
    expect(result.targetValue).toBe(51000); // initialValue + monthlyIncrement
    expect(result.currentValue).toBe(51500);
    expect(result.amountToInvest).toBe(0);
    expect(result.onTrack).toBe(true);
    expect(result.monthsElapsed).toBe(2);
  });

  it("computes amount to invest when behind target", () => {
    vi.setSystemTime(new Date("2024-02-15"));

    const result = calculateVA(baseConfig, 49000);
    expect(result.targetValue).toBe(51000);
    expect(result.amountToInvest).toBe(2000);
    expect(result.onTrack).toBe(false);
  });

  it("returns zero investment when ahead of target", () => {
    vi.setSystemTime(new Date("2024-02-15"));

    const result = calculateVA(baseConfig, 55000);
    expect(result.amountToInvest).toBe(0);
    expect(result.onTrack).toBe(true);
  });

  it("uses previous month snapshot when available", () => {
    vi.setSystemTime(new Date("2024-03-15"));

    const snapshots: SnapshotTotal[] = [
      { date: "2024-02-15", totalValueEur: 52000, totalCostEur: 51000 },
      { date: "2024-02-28", totalValueEur: 53000, totalCostEur: 51000 },
    ];

    const result = calculateVA(baseConfig, 53500, snapshots);
    // Should use last Feb snapshot (53000) + increment (1000) = 54000
    expect(result.targetValue).toBe(54000);
    expect(result.amountToInvest).toBe(500);
  });

  it("falls back to initialValue when no previous month snapshot exists", () => {
    vi.setSystemTime(new Date("2024-03-15"));

    const snapshots: SnapshotTotal[] = [
      // Only January snapshots, nothing for February
      { date: "2024-01-15", totalValueEur: 50500, totalCostEur: 50000 },
    ];

    const result = calculateVA(baseConfig, 51000);
    // No Feb snapshot → falls back to initialValue (50000) + 1000 = 51000
    expect(result.targetValue).toBe(51000);
  });

  it("computes months elapsed correctly", () => {
    vi.setSystemTime(new Date("2025-01-15"));

    const result = calculateVA(baseConfig, 60000);
    expect(result.monthsElapsed).toBe(12);
  });
});

describe("computeTargetForDate", () => {
  it("computes target from previous month snapshot", () => {
    const snapshots: SnapshotTotal[] = [
      { date: "2024-01-31", totalValueEur: 51000, totalCostEur: 50000 },
      { date: "2024-02-28", totalValueEur: 52500, totalCostEur: 51000 },
    ];

    const target = computeTargetForDate(baseConfig, "2024-03-15", snapshots);
    // Last Feb snapshot (52500) + increment (1000) = 53500
    expect(target).toBe(53500);
  });

  it("falls back to initialValue when no previous month snapshot", () => {
    const target = computeTargetForDate(baseConfig, "2024-02-15", []);
    // No Jan snapshot → initialValue (50000) + 1000 = 51000
    expect(target).toBe(51000);
  });

  it("uses the last snapshot of the previous month", () => {
    const snapshots: SnapshotTotal[] = [
      { date: "2024-01-10", totalValueEur: 50200, totalCostEur: 50000 },
      { date: "2024-01-20", totalValueEur: 50800, totalCostEur: 50000 },
      { date: "2024-01-31", totalValueEur: 51200, totalCostEur: 50000 },
    ];

    const target = computeTargetForDate(baseConfig, "2024-02-15", snapshots);
    // Last Jan snapshot (51200) + 1000 = 52200
    expect(target).toBe(52200);
  });
});

describe("computePortfolioTotalEUR", () => {
  it("sums already-converted EUR totals without reconverting currencies", async () => {
    const positions = [
      {
        totalValue: 100,
        totalCost: 80,
        instrument: { currency: "EUR" },
      },
      {
        totalValue: 50,
        totalCost: 40,
        instrument: { currency: "GBP" },
      },
    ] as PortfolioPosition[];

    await expect(computePortfolioTotalEUR(positions)).resolves.toEqual({
      totalValueEur: 150,
      totalCostEur: 120,
    });
  });
});
