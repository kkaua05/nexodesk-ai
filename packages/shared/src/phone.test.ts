import { describe, expect, it } from "vitest";
import { normalizePhone, whatsappJidToPhone, isLidIdentifier } from "./phone";

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

describe("LID identifiers (WhatsApp privacy ids)", () => {
  it("tags an @lid JID instead of fabricating a fake E.164 number", () => {
    const result = normalizePhone("214142959018197@lid");
    expect(result.normalized).toBe("lid:214142959018197");
    expect(result.isValid).toBe(false);
  });

  it("recognizes both the raw JID and the already-tagged form", () => {
    expect(isLidIdentifier("214142959018197@lid")).toBe(true);
    expect(isLidIdentifier("lid:214142959018197")).toBe(true);
    expect(isLidIdentifier("+5551999990001")).toBe(false);
  });

  it("never confuses a real BR number for a LID", () => {
    expect(isLidIdentifier("5551999990001@c.us")).toBe(false);
  });
});
