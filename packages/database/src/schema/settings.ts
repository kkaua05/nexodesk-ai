import { pgTable, text, jsonb } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";

/** Single-row key/value store for company profile, currency, timezone, etc (spec §97). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  ...timestamps,
});

/** External integration connection state (WhatsApp session metadata, Ollama config...). */
export const integrations = pgTable("integrations", {
  id: idColumn(),
  provider: text("provider").notNull().unique(),
  status: text("status").notNull(),
  config: jsonb("config"),
  lastConnectedAt: text("last_connected_at"),
  ...timestamps,
});
