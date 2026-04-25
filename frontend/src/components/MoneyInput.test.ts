import { describe, expect, it } from "vitest";

import { formatMoneyInputDisplay, normalizeMoneyInput } from "./MoneyInput";

describe("normalizeMoneyInput", () => {
  it("removes redundant leading zeroes", () => {
    expect(normalizeMoneyInput("012345")).toBe("12345");
    expect(normalizeMoneyInput("000.50")).toBe("0.50");
    expect(normalizeMoneyInput("01.25")).toBe("1.25");
  });

  it("keeps only one decimal point and two decimals", () => {
    expect(normalizeMoneyInput("12.345")).toBe("12.34");
    expect(normalizeMoneyInput("12..34")).toBe("12.34");
  });

  it("adds commas for every three integer digits", () => {
    expect(formatMoneyInputDisplay("1234")).toBe("1,234");
    expect(formatMoneyInputDisplay("1234567.89")).toBe("1,234,567.89");
    expect(formatMoneyInputDisplay("0.50")).toBe("0.50");
  });
});
