import { describe, expect, it } from "vitest";
import { parseMoneyInput } from "@/lib/format";
import { moneyFmt } from "@/lib/format";

describe("parseMoneyInput", () => {
  it("accepts plain numbers", () => {
    expect(parseMoneyInput("4500")).toBe(4500);
    expect(parseMoneyInput("4500.50")).toBe(4500.5);
  });

  it("accepts thousands separators and currency symbols", () => {
    expect(parseMoneyInput("$4,500")).toBe(4500);
    expect(parseMoneyInput("12,34,567.89")).toBe(1234567.89); // lakh/crore grouping
    expect(parseMoneyInput("₹ 4 500")).toBe(4500);
  });

  it("accepts decimal comma", () => {
    expect(parseMoneyInput("1234,56")).toBe(1234.56);
  });

  it("rejects non-numbers", () => {
    expect(parseMoneyInput("500oops")).toBeNull();
    expect(parseMoneyInput("Infinity")).toBeNull();
    expect(parseMoneyInput("not-a-number")).toBeNull();
    expect(parseMoneyInput("")).toBeNull();
  });
});

describe("moneyFmt", () => {
  it("formats lakh/crore grouping for en-IN", () => {
    const out = moneyFmt(1234567, "INR", "en-IN");
    expect(out).toContain("12,34,567");
    expect(out).toContain("₹");
  });

  it("formats thousands grouping for en-US", () => {
    const out = moneyFmt(1234567.5, "USD", "en-US");
    expect(out).toContain("1,234,567");
  });

  it("handles null as an em dash", () => {
    expect(moneyFmt(null, "USD", "en-US")).toBe("—");
  });

  it("compact notation for big annual figures", () => {
    expect(moneyFmt(1234567, "USD", "en-US", { compact: true, decimals: false })).toMatch(/M/);
  });
});
