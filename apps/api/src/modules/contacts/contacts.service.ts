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
export async function findContactByPhone(rawPhone: string) {
  const { normalized } = normalizePhone(rawPhone);
  return (await (db.select().from(schema.contacts).where(eq(schema.contacts.phoneNormalized, normalized))))[0];
}

export async function findOrCreateContact(data: IncomingContactData) {
  const { normalized, countryCode, callingCode } = normalizePhone(data.phone);

  const existing = (await (db.select().from(schema.contacts).where(eq(schema.contacts.phoneNormalized, normalized))))[0];

  if (existing) {
    const updated = (await (db
          .update(schema.contacts)
          .set({
            lastContactAt: new Date(),
            name: existing.name ?? data.name,
            avatarUrl: data.avatarUrl ?? existing.avatarUrl,
          })
          .where(eq(schema.contacts.id, existing.id))
          .returning()))[0];
    return { contact: updated, isNew: false };
  }

  const created = (await (db
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
      .returning()))[0];

  return { contact: created, isNew: true };
}

export async function listContacts() {
  return (await (db.select().from(schema.contacts)));
}
