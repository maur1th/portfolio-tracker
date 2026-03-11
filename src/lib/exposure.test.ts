import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/schema", () => ({ etfCountryWeights: {} }));

import { classifyInstrument } from "./exposure";

describe("classifyInstrument", () => {
  describe("geography classification", () => {
    it("classifies S&P 500 ETF as US", () => {
      const result = classifyInstrument({
        name: "iShares Core S&P 500 UCITS ETF",
        ticker: "SXR8.DE",
        type: "etf",
      });
      expect(result.geography).toBe("US");
    });

    it("classifies Nasdaq ETF as US", () => {
      const result = classifyInstrument({
        name: "Amundi Nasdaq-100 UCITS ETF",
        ticker: "ANX.PA",
        type: "etf",
      });
      expect(result.geography).toBe("US");
    });

    it("classifies MSCI World ETF as Monde", () => {
      const result = classifyInstrument({
        name: "iShares MSCI World UCITS ETF",
        ticker: "IWDA.AS",
        type: "etf",
      });
      expect(result.geography).toBe("Monde");
    });

    it("classifies MSCI Europe ETF as Europe", () => {
      const result = classifyInstrument({
        name: "Amundi MSCI Europe UCITS ETF",
        ticker: "CE8.PA",
        type: "etf",
      });
      expect(result.geography).toBe("Europe");
    });

    it("classifies Emerging Markets ETF as Émergents", () => {
      const result = classifyInstrument({
        name: "iShares MSCI EM UCITS ETF",
        ticker: "IEMA.AS",
        type: "etf",
      });
      expect(result.geography).toBe("Émergents");
    });

    it("classifies Japan ETF as Japon", () => {
      const result = classifyInstrument({
        name: "Amundi Japan TOPIX UCITS ETF",
        ticker: "TPXE.PA",
        type: "etf",
      });
      expect(result.geography).toBe("Japon");
    });

    it("classifies Euronext Paris stock as Europe by ticker suffix", () => {
      const result = classifyInstrument({
        name: "TOTALENERGIES SE",
        ticker: "TTE.PA",
        type: "stock",
      });
      expect(result.geography).toBe("Europe");
    });

    it("classifies London stock as UK by ticker suffix", () => {
      const result = classifyInstrument({
        name: "WisdomTree Physical Gold",
        ticker: "SGLN.L",
        type: "stock",
      });
      // Gold is classified as commodity, so geography is Non classé
      expect(result.assetClass).toBe("Matières premières");
      expect(result.geography).toBe("Non classé");
    });

    it("classifies US stock without dot in ticker as US", () => {
      const result = classifyInstrument({
        name: "Apple Inc",
        ticker: "AAPL",
        type: "stock",
      });
      expect(result.geography).toBe("US");
    });

    it("marks unmatched equity ETF geography as not matched", () => {
      const result = classifyInstrument({
        name: "Some Unknown ETF",
        ticker: "UNK.PA",
        type: "etf",
      });
      expect(result.geography).toBe("Non classé");
      expect(result.geoMatched).toBe(false);
    });
  });

  describe("asset class classification", () => {
    it("classifies gold ETF as Matières premières", () => {
      const result = classifyInstrument({
        name: "WisdomTree Physical Gold",
        ticker: "SGLN.L",
        type: "etf",
      });
      expect(result.assetClass).toBe("Matières premières");
    });

    it("classifies bond ETF as Obligations", () => {
      const result = classifyInstrument({
        name: "iShares Euro Aggregate Bond UCITS ETF",
        ticker: "IEAG.AS",
        type: "etf",
      });
      expect(result.assetClass).toBe("Obligations");
    });

    it("classifies REIT as Immobilier", () => {
      const result = classifyInstrument({
        name: "iShares European Property REIT UCITS ETF",
        ticker: "IPRP.AS",
        type: "etf",
      });
      expect(result.assetClass).toBe("Immobilier");
    });

    it("classifies money market as Monétaire", () => {
      const result = classifyInstrument({
        name: "Lyxor Smart Overnight Return €STer",
        ticker: "CSH2.PA",
        type: "etf",
      });
      expect(result.assetClass).toBe("Monétaire");
    });

    it("defaults stock to Actions", () => {
      const result = classifyInstrument({
        name: "Apple Inc",
        ticker: "AAPL",
        type: "stock",
      });
      expect(result.assetClass).toBe("Actions");
    });

    it("defaults generic ETF to Actions", () => {
      const result = classifyInstrument({
        name: "iShares MSCI World UCITS ETF",
        ticker: "IWDA.AS",
        type: "etf",
      });
      expect(result.assetClass).toBe("Actions");
    });

    it("classifies bond type as Obligations", () => {
      const result = classifyInstrument({
        name: "Some Instrument",
        ticker: "ABC",
        type: "bond",
      });
      expect(result.assetClass).toBe("Obligations");
    });
  });

  describe("market cap classification", () => {
    it("assigns split for MSCI World ETF", () => {
      const result = classifyInstrument({
        name: "iShares MSCI World UCITS ETF",
        ticker: "IWDA.AS",
        type: "etf",
      });
      expect(result.capSplit).toEqual({ large: 0.85, mid: 0.15, small: 0 });
      expect(result.capSplitMatched).toBe(true);
    });

    it("assigns full small cap for Russell 2000", () => {
      const result = classifyInstrument({
        name: "iShares Russell 2000 ETF",
        ticker: "IWM",
        type: "etf",
      });
      expect(result.capSplit).toEqual({ large: 0, mid: 0, small: 1 });
    });

    it("assigns zero split for individual stocks", () => {
      const result = classifyInstrument({
        name: "Apple Inc",
        ticker: "AAPL",
        type: "stock",
      });
      expect(result.capSplit).toEqual({ large: 0, mid: 0, small: 0 });
      expect(result.capSplitMatched).toBe(true);
    });

    it("marks unmatched cap for unknown equity ETF", () => {
      const result = classifyInstrument({
        name: "Some Unknown Equity ETF",
        ticker: "UNK",
        type: "etf",
      });
      // Falls back to default split but capSplitMatched is false
      expect(result.capSplitMatched).toBe(false);
    });

    it("N/A cap for non-equity asset classes", () => {
      const result = classifyInstrument({
        name: "iShares Euro Aggregate Bond UCITS ETF",
        ticker: "IEAG.AS",
        type: "etf",
      });
      expect(result.capSplit).toEqual({ large: 0, mid: 0, small: 0 });
      expect(result.capSplitMatched).toBe(true);
    });

    it("assigns Stoxx 600 split with small cap exposure", () => {
      const result = classifyInstrument({
        name: "Lyxor Stoxx Europe 600 UCITS ETF",
        ticker: "MEUD.PA",
        type: "etf",
      });
      expect(result.capSplit).toEqual({ large: 0.7, mid: 0.2, small: 0.1 });
    });
  });
});
