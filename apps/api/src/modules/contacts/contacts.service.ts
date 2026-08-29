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
    return { contact: await touchExistingContact(existing, data), isNew: false };
  }

  // The WhatsApp provider can fire two events (`message`/`message_create`) for the
  // same inbound message with no ordering guarantee — a plain check-then-insert has a
  // race window where both concurrent calls pass this "does it exist?" check before
  // either commits, and the loser crashes on the unique phone constraint instead of
  // being recognized as the same contact. `onConflictDoNothing` makes the insert
  // itself the atomic check.
  const [created] = await db
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
    .onConflictDoNothing({ target: schema.contacts.phoneNormalized })
    .returning();

  if (created) return { contact: created, isNew: true };

  // Lost the race — the concurrent call already created it; fall through to an update.
  const raced = (await (db.select().from(schema.contacts).where(eq(schema.contacts.phoneNormalized, normalized))))[0]!;
  return { contact: await touchExistingContact(raced, data), isNew: false };
}

async function touchExistingContact(existing: typeof schema.contacts.$inferSelect, data: IncomingContactData) {
  return (await (db
        .update(schema.contacts)
        .set({
          lastContactAt: new Date(),
          name: existing.name ?? data.name,
          avatarUrl: data.avatarUrl ?? existing.avatarUrl,
        })
        .where(eq(schema.contacts.id, existing.id))
        .returning()))[0]!;
}

export async function listContacts() {
  return (await (db.select().from(schema.contacts)));
}
