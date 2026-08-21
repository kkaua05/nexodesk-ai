import { describe, expect, it } from "vitest";
import { toCents, fromCents, formatCents, sumCents, splitInstallments } from "./money";

describe("money", () => {
  it("converts reais to integer cents without float drift", () => {
    expect(toCents(1500)).toBe(150000);
    expect(toCents(19.9)).toBe(1990);
  });

  it("formats cents as BRL currency", () => {
    expect(formatCents(150000)).toContain("1.500,00");
  });

  it("sums a list of cent values", () => {
    expect(sumCents(100, 250, 50)).toBe(400);
  });

  describe("splitInstallments", () => {
    it("splits evenly when the total divides cleanly", () => {
      expect(splitInstallments(300000, 3)).toEqual([100000, 100000, 100000]);
    });

    it("distributes leftover cents across the first installments instead of losing them", () => {
      const installments = splitInstallments(100, 3);
      expect(installments.reduce((a, b) => a + b, 0)).toBe(100);
      expect(installments).toEqual([34, 33, 33]);
    });

    it("throws for a non-positive installment count", () => {
      expect(() => splitInstallments(1000, 0)).toThrow();
    });
  });

  it("fromCents is the inverse of toCents for whole-cent values", () => {
    expect(fromCents(toCents(42.5))).toBeCloseTo(42.5);
  });
});
