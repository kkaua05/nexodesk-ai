import { describe, expect, it } from "vitest";
import { findOrCreateContact, findContactByPhone } from "./contacts.service";

describe("findOrCreateContact", () => {
  it("creates a new contact for a phone number seen for the first time", () => {
    const { contact, isNew } = findOrCreateContact({ phone: "+5551988880001", name: "Ana", firstMessageAt: new Date() });
    expect(isNew).toBe(true);
    expect(contact.phoneNormalized).toBe("+5551988880001");
  });

  it("never creates a duplicate contact for the same phone in different formats (spec §1/§12)", () => {
    const first = findOrCreateContact({ phone: "51988880002", name: "Bruno", firstMessageAt: new Date() });
    const second = findOrCreateContact({ phone: "+55 51 98888-0002", firstMessageAt: new Date() });
    const third = findOrCreateContact({ phone: "5551988880002@c.us", firstMessageAt: new Date() });

    expect(second.isNew).toBe(false);
    expect(third.isNew).toBe(false);
    expect(second.contact.id).toBe(first.contact.id);
    expect(third.contact.id).toBe(first.contact.id);
  });

  it("updates lastContactAt and preserves the existing name on a repeat contact", () => {
    const { contact: created } = findOrCreateContact({ phone: "+5551988880003", name: "Carla", firstMessageAt: new Date(2020, 0, 1) });
    const { contact: updated } = findOrCreateContact({ phone: "+5551988880003", name: "Nome diferente", firstMessageAt: new Date() });

    expect(updated.name).toBe("Carla");
    expect(updated.lastContactAt.getTime()).toBeGreaterThan(created.lastContactAt.getTime());
  });

  it("findContactByPhone locates a contact regardless of the raw format passed in", () => {
    findOrCreateContact({ phone: "+5551988880004", firstMessageAt: new Date() });
    const found = findContactByPhone("51 98888-0004");
    expect(found?.phoneNormalized).toBe("+5551988880004");
  });
});
