import { eq } from "drizzle-orm";
import { db } from "./database.js";
import { schema } from "@nexodesk/database";

/**
 * Sequential, human-readable document numbers (spec §74) — e.g. PROP-000001, VEN-000001.
 * Backed by a durable counter in `settings` (key `seq:<prefix>`) so numbers stay
 * monotonic even if a document is later deleted. Internal ids remain ULIDs.
 */
export function nextDocumentNumber(prefix: string): string {
  const key = `seq:${prefix}`;
  const existing = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get();
  const current = (existing?.value as number | undefined) ?? 0;
  const next = current + 1;

  if (existing) {
    db.update(schema.settings).set({ value: next }).where(eq(schema.settings.key, key)).run();
  } else {
    db.insert(schema.settings).values({ key, value: next }).run();
  }

  return `${prefix}-${String(next).padStart(6, "0")}`;
}
