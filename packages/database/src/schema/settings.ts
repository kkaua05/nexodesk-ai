import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { idColumn, timestamps } from "./_helpers";

/** Single-row key/value store for company profile, currency, timezone, etc (spec §97). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  ...timestamps,
});

/** External integration connection state (WhatsApp session metadata, Ollama config...). */
export const integrations = sqliteTable("integrations", {
  id: idColumn(),
  provider: text("provider").notNull().unique(),
  status: text("status").notNull(),
  config: text("config", { mode: "json" }),
  lastConnectedAt: text("last_connected_at"),
  ...timestamps,
});
