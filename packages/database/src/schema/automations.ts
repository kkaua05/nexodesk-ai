import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { idColumn, timestamps } from "./_helpers";

export const automations = sqliteTable("automations", {
  id: idColumn(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

/** Every automation execution is logged — automations are never invisible (spec §45). */
export const automationRuns = sqliteTable(
  "automation_runs",
  {
    id: idColumn(),
    /**
     * Intentionally NOT a foreign key to `automations.key`: audit logging must never
     * fail because the catalog row doesn't exist yet (e.g. before the system seed runs,
     * or for a one-off business action like the sale-conversion log in sales.service.ts).
     */
    automationKey: text("automation_key").notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    status: text("status", { enum: ["sucesso", "erro", "pulado"] as const }).notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    result: text("result", { mode: "json" }),
    error: text("error"),
    ...timestamps,
  },
  (table) => [index("automation_runs_key_idx").on(table.automationKey)],
);
