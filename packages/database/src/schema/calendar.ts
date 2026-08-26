import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";
import { customers } from "./customers";
import { projects } from "./projects";

export const CALENDAR_EVENT_TYPE = [
  "reuniao",
  "ligacao",
  "follow_up",
  "pagamento",
  "vencimento",
  "entrega",
  "tarefa",
  "projeto",
  "atendimento",
] as const;

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: idColumn(),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type", { enum: CALENDAR_EVENT_TYPE }).notNull(),
    customerId: text("customer_id").references(() => customers.id),
    projectId: text("project_id").references(() => projects.id),
    responsibleUserId: text("responsible_user_id"),
    startAt: timestamp("start_at", { mode: "date" }).notNull(),
    endAt: timestamp("end_at", { mode: "date" }),
    /**
     * When set, this event is a read-only projection of a receivable/payable due date
     * (spec §32) — auto-generated, never duplicated by manual creation.
     */
    sourceReceivableId: text("source_receivable_id"),
    sourcePayableId: text("source_payable_id"),
    ...timestamps,
  },
  (table) => [index("calendar_events_start_idx").on(table.startAt)],
);
