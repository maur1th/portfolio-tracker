import { describe, expect, it } from "vitest";
import { buildAccountSparklineHistory } from "./account-sparklines";

describe("buildAccountSparklineHistory", () => {
  it("returns ordered daily values per account", () => {
    const history = buildAccountSparklineHistory([
      { accountId: 2, date: "2026-03-11", totalValueEur: 1800 },
      { accountId: 1, date: "2026-03-10", totalValueEur: 900 },
      { accountId: 1, date: "2026-03-09", totalValueEur: 850 },
      { accountId: 2, date: "2026-03-10", totalValueEur: 1700 },
    ]);

    expect(history.get(1)).toEqual([
      { date: "2026-03-09", value: 850 },
      { date: "2026-03-10", value: 900 },
    ]);
    expect(history.get(2)).toEqual([
      { date: "2026-03-10", value: 1700 },
      { date: "2026-03-11", value: 1800 },
    ]);
  });

  it("ignores rows missing date or value", () => {
    const history = buildAccountSparklineHistory([
      { accountId: 1, date: null, totalValueEur: 900 },
      { accountId: 1, date: "2026-03-10", totalValueEur: null },
      { accountId: 1, date: "2026-03-11", totalValueEur: 950 },
    ]);

    expect(history.get(1)).toEqual([{ date: "2026-03-11", value: 950 }]);
  });

  it("supports accounts with one or zero points", () => {
    const history = buildAccountSparklineHistory([
      { accountId: 2, date: "2026-03-11", totalValueEur: 500 },
    ]);

    expect(history.get(2)).toEqual([{ date: "2026-03-11", value: 500 }]);
    expect(history.get(3)).toBeUndefined();
  });
});
