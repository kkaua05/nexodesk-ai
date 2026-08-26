import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
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

export const followUps = pgTable(
  "follow_ups",
  {
    id: idColumn(),
    reason: text("reason", { enum: FOLLOWUP_REASON }).notNull(),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    proposalId: text("proposal_id").references(() => proposals.id, { onDelete: "cascade" }),
    note: text("note"),
    dueAt: timestamp("due_at", { mode: "date" }).notNull(),
    resolvedAt: timestamp("resolved_at", { mode: "date" }),
    ...timestamps,
  },
  (table) => [index("follow_ups_due_idx").on(table.dueAt)],
);
