import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";

export const NOTIFICATION_TYPE = [
  "nova_mensagem",
  "lead_quente",
  "follow_up",
  "pagamento",
  "atraso",
  "projeto_vencendo",
  "tarefa_atrasada",
  "whatsapp_desconectado",
] as const;

export const notifications = pgTable(
  "notifications",
  {
    id: idColumn(),
    userId: text("user_id"),
    type: text("type", { enum: NOTIFICATION_TYPE }).notNull(),
    title: text("title").notNull(),
    body: text("body"),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    readAt: timestamp("read_at", { mode: "date" }),
    ...timestamps,
  },
  (table) => [index("notifications_user_idx").on(table.userId), index("notifications_read_idx").on(table.readAt)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: idColumn(),
    userId: text("user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    changes: jsonb("changes"),
    ...timestamps,
  },
  (table) => [index("audit_logs_entity_idx").on(table.entityType, table.entityId)],
);
