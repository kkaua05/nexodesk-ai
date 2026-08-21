import { describe, expect, it } from "vitest";
import { normalizePhone, whatsappJidToPhone } from "./phone";

describe("normalizePhone", () => {
  it("normalizes a BR number without country code to E.164", () => {
    const result = normalizePhone("51999990001");
    expect(result.normalized).toBe("+5551999990001");
    expect(result.isValid).toBe(true);
    expect(result.countryCode).toBe("BR");
  });

  it("normalizes a number already containing the country code", () => {
    const result = normalizePhone("+55 51 99999-0001");
    expect(result.normalized).toBe("+5551999990001");
  });

  it("strips WhatsApp JID suffixes before parsing", () => {
    const result = normalizePhone("5551999990001@c.us");
    expect(result.normalized).toBe("+5551999990001");
  });

  it("produces the same normalized value for equivalent representations of the same number", () => {
    const a = normalizePhone("(51) 99999-0001");
    const b = normalizePhone("+5551999990001");
    const c = normalizePhone("5551999990001@c.us");
    expect(a.normalized).toBe(b.normalized);
    expect(b.normalized).toBe(c.normalized);
  });

  it("falls back to a digits-only representation for unparseable input instead of throwing", () => {
    const result = normalizePhone("not-a-phone-number");
    expect(result.isValid).toBe(false);
    expect(() => normalizePhone("not-a-phone-number")).not.toThrow();
  });
});

describe("whatsappJidToPhone", () => {
  it("extracts the phone segment from a WhatsApp JID", () => {
    expect(whatsappJidToPhone("5551999990001@c.us")).toBe("5551999990001");
  });
});
