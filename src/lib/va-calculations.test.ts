import { describe, it, expect } from "vitest";
import {
  computeTargetForSnapshot,
  computeVariance,
  computeMonthProgress,
  computeProgressRatios,
  buildChartData,
} from "./va-calculations";

describe("computeTargetForSnapshot", () => {
  const config = { startDate: "2026-01-01", monthlyIncrement: 1000, initialValue: 10000 };

  it("uses previous month's last snapshot as base", () => {
    const snapshots = [
      { date: "2026-01-15", totalValueEur: 11000 },
      { date: "2026-01-25", totalValueEur: 11500 },
      { date: "2026-02-15", totalValueEur: 12000 },
    ];
    expect(computeTargetForSnapshot(config, "2026-02-15", snapshots)).toBe(12500);
  });

  it("uses initialValue when no previous month snapshot exists", () => {
    const snapshots = [{ date: "2026-01-15", totalValueEur: 11000 }];
    expect(computeTargetForSnapshot(config, "2026-01-15", snapshots)).toBe(11000);
  });

  it("picks the latest snapshot of the previous month when multiple exist", () => {
    const snapshots = [
      { date: "2026-03-05", totalValueEur: 13000 },
      { date: "2026-03-20", totalValueEur: 13500 },
      { date: "2026-04-10", totalValueEur: 14000 },
    ];
    expect(computeTargetForSnapshot(config, "2026-04-10", snapshots)).toBe(14500);
  });
});

describe("computeVariance", () => {
  it("returns positive variance when current > target", () => {
    const result = computeVariance(12000, 11000);
    expect(result.variance).toBe(1000);
    expect(result.isPositive).toBe(true);
  });

  it("returns negative variance when current < target", () => {
    const result = computeVariance(9000, 11000);
    expect(result.variance).toBe(-2000);
    expect(result.isPositive).toBe(false);
  });

  it("returns zero variance when values are equal", () => {
    const result = computeVariance(11000, 11000);
    expect(result.variance).toBe(0);
    expect(result.isPositive).toBe(true);
  });
});

describe("computeMonthProgress", () => {
  it("computes progress for mid-month", () => {
    const date = new Date(2026, 2, 15); // March 15, 2026
    const result = computeMonthProgress(date);
    expect(result.daysInMonth).toBe(31);
    expect(result.daysRemaining).toBe(16);
    expect(result.daysProgress).toBeCloseTo((15 / 31) * 100, 1);
  });

  it("computes progress for first day of month", () => {
    const date = new Date(2026, 0, 1); // Jan 1
    const result = computeMonthProgress(date);
    expect(result.daysRemaining).toBe(30);
    expect(result.daysProgress).toBeCloseTo((1 / 31) * 100, 1);
  });

  it("handles February correctly", () => {
    const date = new Date(2026, 1, 14); // Feb 14, 2026 (non-leap)
    const result = computeMonthProgress(date);
    expect(result.daysInMonth).toBe(28);
    expect(result.daysRemaining).toBe(14);
  });
});

describe("computeProgressRatios", () => {
  it("computes ratios relative to the larger value", () => {
    const result = computeProgressRatios(8000, 10000);
    expect(result.targetRatio).toBe(100);
    expect(result.currentRatio).toBe(80);
  });

  it("handles current > target", () => {
    const result = computeProgressRatios(12000, 10000);
    expect(result.currentRatio).toBe(100);
    expect(result.targetRatio).toBeCloseTo(83.33, 1);
  });

  it("handles zero values", () => {
    const result = computeProgressRatios(0, 0);
    expect(result.targetRatio).toBe(0);
    expect(result.currentRatio).toBe(0);
  });
});

describe("buildChartData", () => {
  const config = { startDate: "2026-01-01", monthlyIncrement: 1000, initialValue: 10000 };

  it("returns at most 6 entries", () => {
    const snapshots = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-${String(i + 1).padStart(2, "0")}-15`,
      totalValueEur: 10000 + i * 1000,
    }));
    const result = buildChartData(config, snapshots);
    expect(result).toHaveLength(6);
  });

  it("includes target and actual values", () => {
    const snapshots = [
      { date: "2026-01-15", totalValueEur: 11000 },
      { date: "2026-02-15", totalValueEur: 12500 },
    ];
    const result = buildChartData(config, snapshots);
    expect(result).toHaveLength(2);
    expect(result[0].actual).toBe(11000);
    expect(result[1].actual).toBe(12500);
    expect(result[1].target).toBe(12000); // prev month last snapshot (11000) + 1000
  });

  it("returns empty array for no snapshots", () => {
    expect(buildChartData(config, [])).toEqual([]);
  });
});
