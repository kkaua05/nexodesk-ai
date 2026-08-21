import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { idColumn, timestamps } from "./_helpers";
import { leads } from "./crm";
import { customers } from "./customers";
import { proposals } from "./proposals";

export const FOLLOWUP_REASON = [
  "lead_sem_resposta",
  "proposta_sem_retorno",
  "orcamento_parado",
  "cliente_sem_contato",
  "cobranca_proxima",
  "pagamento_atrasado",
] as const;

export const followUps = sqliteTable(
  "follow_ups",
  {
    id: idColumn(),
    reason: text("reason", { enum: FOLLOWUP_REASON }).notNull(),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    proposalId: text("proposal_id").references(() => proposals.id, { onDelete: "cascade" }),
    note: text("note"),
    dueAt: integer("due_at", { mode: "timestamp_ms" }).notNull(),
    resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [index("follow_ups_due_idx").on(table.dueAt)],
);
