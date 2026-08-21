import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { normalizePhone } from "@nexodesk/shared";

export interface IncomingContactData {
  name?: string;
  phone: string;
  avatarUrl?: string;
  firstMessageAt: Date;
}

/**
 * Core dedup rule (spec §1, §12): the same normalized phone number must never
 * create two contacts. Everything else (leads, conversations, timeline) hangs
 * off this single source of truth per phone.
 */
export function findContactByPhone(rawPhone: string) {
  const { normalized } = normalizePhone(rawPhone);
  return db.select().from(schema.contacts).where(eq(schema.contacts.phoneNormalized, normalized)).get();
}

export function findOrCreateContact(data: IncomingContactData) {
  const { normalized, countryCode, callingCode } = normalizePhone(data.phone);

  const existing = db.select().from(schema.contacts).where(eq(schema.contacts.phoneNormalized, normalized)).get();

  if (existing) {
    const updated = db
      .update(schema.contacts)
      .set({
        lastContactAt: new Date(),
        name: existing.name ?? data.name,
        avatarUrl: data.avatarUrl ?? existing.avatarUrl,
      })
      .where(eq(schema.contacts.id, existing.id))
      .returning()
      .get();
    return { contact: updated, isNew: false };
  }

  const created = db
    .insert(schema.contacts)
    .values({
      name: data.name,
      phoneRaw: data.phone,
      phoneNormalized: normalized,
      countryCode,
      callingCode,
      avatarUrl: data.avatarUrl,
      firstContactAt: data.firstMessageAt,
      lastContactAt: data.firstMessageAt,
    })
    .returning()
    .get();

  return { contact: created, isNew: true };
}

export function listContacts() {
  return db.select().from(schema.contacts).all();
}
