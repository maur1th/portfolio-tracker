import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  selectState,
  insertValues,
  conflictUpdates,
} = vi.hoisted(() => ({
  selectState: {
    rows: [] as Array<{ rate: number }>,
  },
  insertValues: [] as Array<Record<string, unknown>>,
  conflictUpdates: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => selectState.rows),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((value: Record<string, unknown>) => {
        insertValues.push(value);
        return {
          onConflictDoUpdate: vi.fn(async (config: Record<string, unknown>) => {
            conflictUpdates.push(config);
          }),
        };
      }),
    })),
  },
}));

vi.mock("@/db/schema", () => ({
  fxRates: {
    rate: "rate",
    fetchedAt: "fetched_at",
    baseCurrency: "base_currency",
    quoteCurrency: "quote_currency",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
}));

import { convertToEUR, getExchangeRate, refreshExchangeRates } from "./currencies";

describe("currencies", () => {
  beforeEach(() => {
    selectState.rows = [];
    insertValues.length = 0;
    conflictUpdates.length = 0;
    vi.restoreAllMocks();
  });

  it("returns the stored exchange rate", async () => {
    selectState.rows = [{ rate: 1.17 }];

    await expect(getExchangeRate("GBP", "EUR")).resolves.toBe(1.17);
  });

  it("lazy-fetches from ECB when no stored rate exists", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(`
        <Cube>
          <Cube time="2026-03-12">
            <Cube currency="GBP" rate="0.84746" />
          </Cube>
        </Cube>
      `),
    } as unknown as Response);

    const rate = await getExchangeRate("GBP", "EUR");
    expect(rate).toBeCloseTo(1 / 0.84746);
    expect(insertValues).toHaveLength(1);
    expect(insertValues[0]).toMatchObject({
      baseCurrency: "GBP",
      quoteCurrency: "EUR",
    });
  });

  it("throws when lazy fetch also has no rate", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(`<Cube></Cube>`),
    } as unknown as Response);

    await expect(getExchangeRate("XYZ", "EUR")).rejects.toThrow(
      "No exchange rate available for XYZ->EUR"
    );
  });

  it("converts using the stored rate", async () => {
    selectState.rows = [{ rate: 1.2 }];

    await expect(convertToEUR(10, "GBP")).resolves.toBe(12);
  });

  it("stores refreshed exchange rates in the database", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(`
        <Cube>
          <Cube time="2026-03-12">
            <Cube currency="GBP" rate="0.84746" />
          </Cube>
        </Cube>
      `),
    } as unknown as Response);

    await expect(refreshExchangeRates(["GBP", "EUR"])).resolves.toBe(1);
    expect(insertValues).toHaveLength(1);
    expect(insertValues[0]).toMatchObject({
      baseCurrency: "GBP",
      quoteCurrency: "EUR",
      rate: 1 / 0.84746,
    });
    expect(conflictUpdates).toHaveLength(1);
  });
});
