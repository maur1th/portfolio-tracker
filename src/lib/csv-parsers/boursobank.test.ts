import { describe, it, expect } from "vitest";
import { parseBoursobankCSV } from "./boursobank";

describe("parseBoursobankCSV", () => {
  it("parses standard Boursobank CSV with French headers", () => {
    const csv = [
      "Code ISIN;Désignation;Quantité;PRU;Devise",
      "FR0000120271;TOTALENERGIES;50;45,30;EUR",
      "FR0000121014;LVMH;10;680,50;EUR",
    ].join("\n");

    const result = parseBoursobankCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      isin: "FR0000120271",
      name: "TOTALENERGIES",
      quantity: 50,
      avgCostPerUnit: 45.3,
      currency: "EUR",
    });
    expect(result[1]).toEqual({
      isin: "FR0000121014",
      name: "LVMH",
      quantity: 10,
      avgCostPerUnit: 680.5,
      currency: "EUR",
    });
  });

  it("handles French number format with spaces and commas", () => {
    const csv = [
      "Code ISIN;Désignation;Quantité;PRU;Devise",
      "FR0000120271;TOTALENERGIES;1 000;1 234,56;EUR",
    ].join("\n");

    const result = parseBoursobankCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1000);
    expect(result[0].avgCostPerUnit).toBe(1234.56);
  });

  it("skips rows with missing required fields", () => {
    const csv = [
      "Code ISIN;Désignation;Quantité;PRU;Devise",
      "FR0000120271;;50;45,30;EUR",
    ].join("\n");

    const result = parseBoursobankCSV(csv);
    expect(result).toHaveLength(0);
  });

  it("skips rows with invalid numbers", () => {
    const csv = [
      "Code ISIN;Désignation;Quantité;PRU;Devise",
      "FR0000120271;TOTAL;abc;45,30;EUR",
    ].join("\n");

    const result = parseBoursobankCSV(csv);
    expect(result).toHaveLength(0);
  });

  it("defaults currency to EUR when not provided", () => {
    const csv = [
      "name;quantity;buyingPrice",
      "TOTAL;50;45.30",
    ].join("\n");

    const result = parseBoursobankCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].currency).toBe("EUR");
  });

  it("handles alternative English headers", () => {
    const csv = [
      "isin;name;quantity;buyingPrice;currency",
      "FR0000120271;TOTAL;50;45.30;EUR",
    ].join("\n");

    const result = parseBoursobankCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].isin).toBe("FR0000120271");
    expect(result[0].name).toBe("TOTAL");
  });

  it("uppercases currency", () => {
    const csv = [
      "name;quantity;buyingPrice;currency",
      "TOTAL;50;45.30;eur",
    ].join("\n");

    const result = parseBoursobankCSV(csv);
    expect(result[0].currency).toBe("EUR");
  });

  it("returns empty array for empty CSV", () => {
    const csv = "Code ISIN;Désignation;Quantité;PRU;Devise";
    const result = parseBoursobankCSV(csv);
    expect(result).toEqual([]);
  });

  it("sets isin to undefined when not present", () => {
    const csv = [
      "name;quantity;buyingPrice",
      "TOTAL;50;45.30",
    ].join("\n");

    const result = parseBoursobankCSV(csv);
    expect(result[0].isin).toBeUndefined();
  });
});
