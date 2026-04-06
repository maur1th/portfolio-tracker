import { describe, it, expect } from "vitest";
import { getTimeRangeCutoff } from "./time-range";

describe("getTimeRangeCutoff", () => {
  const now = new Date(2026, 3, 6); // 2026-04-06

  it("returns 30 days before now", () => {
    const cutoff = getTimeRangeCutoff("30d", now);
    expect(cutoff).toEqual(new Date(2026, 2, 7)); // 2026-03-07
  });

  it("returns 90 days before now", () => {
    const cutoff = getTimeRangeCutoff("90d", now);
    expect(cutoff).toEqual(new Date(2026, 0, 6)); // 2026-01-06
  });

  it("returns 6 months before now", () => {
    const cutoff = getTimeRangeCutoff("6m", now);
    expect(cutoff).toEqual(new Date(2025, 9, 6)); // 2025-10-06
  });

  it("returns January 1st of the current year for YTD", () => {
    const cutoff = getTimeRangeCutoff("ytd", now);
    expect(cutoff).toEqual(new Date(2026, 0, 1)); // 2026-01-01
  });

  it("returns 12 months before now", () => {
    const cutoff = getTimeRangeCutoff("12m", now);
    expect(cutoff).toEqual(new Date(2025, 3, 6)); // 2025-04-06
  });

  it("handles month rollover for 6m (e.g. from March 31)", () => {
    const march31 = new Date(2026, 2, 31); // 2026-03-31
    const cutoff = getTimeRangeCutoff("6m", march31);
    // JS Date rolls Sept 31 → Oct 1
    expect(cutoff).toEqual(new Date(2025, 9, 1)); // 2025-10-01
  });

  it("handles 90d crossing year boundary", () => {
    const jan15 = new Date(2026, 0, 15); // 2026-01-15
    const cutoff = getTimeRangeCutoff("90d", jan15);
    expect(cutoff).toEqual(new Date(2025, 9, 17)); // 2025-10-17
  });
});
