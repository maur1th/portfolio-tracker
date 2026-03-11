import { describe, it, expect } from "vitest";
import { formatCurrency, formatPercent, formatQuantity } from "./format";

describe("formatCurrency", () => {
  it("formats EUR by default", () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("€");
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0");
    expect(result).toContain("€");
  });

  it("formats negative amounts", () => {
    const result = formatCurrency(-500);
    expect(result).toContain("500");
    expect(result).toContain("€");
  });

  it("formats USD when specified", () => {
    const result = formatCurrency(100, "USD");
    expect(result).toContain("100");
    expect(result).toContain("$");
  });

  it("formats GBP when specified", () => {
    const result = formatCurrency(100, "GBP");
    expect(result).toContain("100");
    expect(result).toContain("£");
  });
});

describe("formatPercent", () => {
  it("formats positive percentage", () => {
    const result = formatPercent(0.1234);
    expect(result).toContain("12");
    expect(result).toContain("34");
    expect(result).toContain("%");
  });

  it("formats zero percent", () => {
    const result = formatPercent(0);
    expect(result).toContain("0");
    expect(result).toContain("%");
  });

  it("formats negative percentage", () => {
    const result = formatPercent(-0.05);
    expect(result).toContain("5");
    expect(result).toContain("%");
  });
});

describe("formatQuantity", () => {
  it("formats integer quantity without decimals", () => {
    const result = formatQuantity(100);
    expect(result).toContain("100");
    expect(result).not.toContain(",");
    expect(result).not.toContain(".");
  });

  it("formats fractional quantity", () => {
    const result = formatQuantity(10.5);
    expect(result).toContain("10");
    expect(result).toContain("5");
  });

  it("formats large quantity with thousands separator", () => {
    const result = formatQuantity(10000);
    // fr-FR uses narrow no-break space as thousands separator
    expect(result.replace(/\s/g, "")).toBe("10000");
  });

  it("limits to 4 decimal places", () => {
    const result = formatQuantity(1.123456);
    // fr-FR uses comma as decimal separator, rounds to 4 decimals: "1,1235"
    expect(result).toContain("1235");
    expect(result).not.toContain("123456");
  });
});
