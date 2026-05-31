import { describe, it, expect } from "vitest";
import { yahooQuoteUrl } from "./links";

describe("yahooQuoteUrl", () => {
  it("builds a Yahoo Finance quote URL from a ticker", () => {
    expect(yahooQuoteUrl("WPEA.PA")).toBe(
      "https://finance.yahoo.com/quote/WPEA.PA"
    );
    expect(yahooQuoteUrl("IUSN.DE")).toBe(
      "https://finance.yahoo.com/quote/IUSN.DE"
    );
  });

  it("redirects the gold ETC to the 24h gold futures contract", () => {
    expect(yahooQuoteUrl("SGLN.L")).toBe(
      "https://finance.yahoo.com/quote/GC=F"
    );
  });

  it("preserves '=' in futures symbols but escapes spaces", () => {
    expect(yahooQuoteUrl("GC=F")).toBe("https://finance.yahoo.com/quote/GC=F");
    expect(yahooQuoteUrl("BRK B")).toBe(
      "https://finance.yahoo.com/quote/BRK%20B"
    );
  });
});
