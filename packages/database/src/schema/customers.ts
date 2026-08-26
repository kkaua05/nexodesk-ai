import { pgTable, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";
import { contacts } from "./whatsapp";
import { leads } from "./crm";

export const customers = pgTable(
  "customers",
  {
    id: idColumn(),
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id),
    /** The lead that converted into this customer — preserved, never deleted (spec §17). */
    originLeadId: text("origin_lead_id").references(() => leads.id),
    name: text("name").notNull(),
    email: text("email"),
    company: text("company"),
    segment: text("segment"),
    document: text("document"),
    address: text("address"),
    responsibleUserId: text("responsible_user_id"),
    notes: text("notes"),
    customerSince: timestamp("customer_since", { mode: "date" }).notNull(),
    ...timestamps,
  },
  (table) => [index("customers_contact_idx").on(table.contactId)],
);

/**
 * Aggregated cross-module timeline (spec §19): populated by domain services as real
 * events occur (message, proposal, sale, payment, project stage...), never synthesized.
 */
export const timelineEvents = pgTable(
  "timeline_events",
  {
    id: idColumn(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    leadId: text("lead_id").references(() => leads.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    valueCents: integer("value_cents"),
    metadata: jsonb("metadata"),
    occurredAt: timestamp("occurred_at", { mode: "date" }).notNull(),
    ...timestamps,
  },
  (table) => [index("timeline_events_customer_idx").on(table.customerId)],
);
