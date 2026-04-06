import { describe, it, expect } from "vitest";
import {
  formatYahooTicker,
  selectBestExchangeTicker,
  EXCHANGE_PREFERENCE,
  type OpenFIGIResult,
} from "./yahoo-finance";

describe("formatYahooTicker", () => {
  it("maps French exchanges to .PA suffix", () => {
    expect(formatYahooTicker("MC", "FP")).toBe("MC.PA");
    expect(formatYahooTicker("MC", "EP")).toBe("MC.PA");
    expect(formatYahooTicker("MC", "PA")).toBe("MC.PA");
  });

  it("maps German exchanges to .DE suffix", () => {
    expect(formatYahooTicker("SAP", "GR")).toBe("SAP.DE");
    expect(formatYahooTicker("SAP", "GY")).toBe("SAP.DE");
    expect(formatYahooTicker("SAP", "GF")).toBe("SAP.DE");
  });

  it("maps London to .L suffix", () => {
    expect(formatYahooTicker("SHEL", "LN")).toBe("SHEL.L");
  });

  it("maps Swiss exchanges to .SW suffix", () => {
    expect(formatYahooTicker("NESN", "SW")).toBe("NESN.SW");
    expect(formatYahooTicker("NESN", "SE")).toBe("NESN.SW");
  });

  it("returns bare ticker for US exchanges", () => {
    expect(formatYahooTicker("AAPL", "US")).toBe("AAPL");
    expect(formatYahooTicker("MSFT", "UW")).toBe("MSFT");
    expect(formatYahooTicker("GOOG", "UN")).toBe("GOOG");
  });

  it("maps other European exchanges", () => {
    expect(formatYahooTicker("ABI", "EB")).toBe("ABI.BR");
    expect(formatYahooTicker("PHIA", "EA")).toBe("PHIA.AS");
    expect(formatYahooTicker("EDP", "EL")).toBe("EDP.LS");
    expect(formatYahooTicker("UCG", "IM")).toBe("UCG.MI");
  });

  it("returns ticker as-is for unknown exchange codes", () => {
    expect(formatYahooTicker("FOO", "ZZ")).toBe("FOO");
  });
});

describe("selectBestExchangeTicker", () => {
  it("returns null for empty data", () => {
    expect(selectBestExchangeTicker([])).toBeNull();
  });

  it("returns null when no items have recognised exchanges", () => {
    const data: OpenFIGIResult[] = [
      { ticker: "FOO", exchCode: "ZZ" },
      { ticker: "BAR", exchCode: "XX" },
    ];
    expect(selectBestExchangeTicker(data)).toBeNull();
  });

  it("picks the single primary exchange match", () => {
    const data: OpenFIGIResult[] = [
      { ticker: "MC", exchCode: "FP" },
    ];
    expect(selectBestExchangeTicker(data)).toBe("MC.PA");
  });

  it("prefers Paris over other exchanges regardless of order", () => {
    const data: OpenFIGIResult[] = [
      { ticker: "SAP", exchCode: "GR" },
      { ticker: "SAP", exchCode: "LN" },
      { ticker: "SAP", exchCode: "FP" },
      { ticker: "SAP", exchCode: "US" },
    ];
    expect(selectBestExchangeTicker(data)).toBe("SAP.PA");
  });

  it("prefers Paris even when it appears last", () => {
    const data: OpenFIGIResult[] = [
      { ticker: "TTE", exchCode: "US" },
      { ticker: "TTE", exchCode: "LN" },
      { ticker: "TTE", exchCode: "EP" },
    ];
    expect(selectBestExchangeTicker(data)).toBe("TTE.PA");
  });

  it("falls back to next preferred exchange when Paris is absent", () => {
    const data: OpenFIGIResult[] = [
      { ticker: "NESN", exchCode: "US" },
      { ticker: "NESN", exchCode: "SW" },
      { ticker: "NESN", exchCode: "GR" },
    ];
    // GR (index 3) beats SW (index 6) beats US (index 8)
    expect(selectBestExchangeTicker(data)).toBe("NESN.DE");
  });

  it("skips items with missing ticker or exchCode", () => {
    const data: OpenFIGIResult[] = [
      { ticker: undefined, exchCode: "FP" },
      { ticker: "MC", exchCode: undefined },
      { ticker: "MC", exchCode: "GR" },
    ];
    expect(selectBestExchangeTicker(data)).toBe("MC.DE");
  });

  it("handles case-insensitive exchange codes", () => {
    const data: OpenFIGIResult[] = [
      { ticker: "MC", exchCode: "fp" },
    ];
    expect(selectBestExchangeTicker(data)).toBe("MC.PA");
  });

  it("respects full preference order", () => {
    // Verify the preference list order is what we expect
    expect(EXCHANGE_PREFERENCE).toEqual(["FP", "EP", "PA", "GR", "GY", "LN", "SW", "SE", "US"]);
  });
});
