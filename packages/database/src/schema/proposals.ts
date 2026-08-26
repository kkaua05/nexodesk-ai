import { pgTable, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";
import { leads } from "./crm";
import { customers } from "./customers";
import { services } from "./catalog";
import { PROPOSAL_STATUS } from "@nexodesk/shared";

export const proposals = pgTable(
  "proposals",
  {
    id: idColumn(),
    /** Human-readable sequential document number, e.g. PROP-000001 (spec §74). */
    number: text("number").notNull(),
    leadId: text("lead_id").references(() => leads.id),
    customerId: text("customer_id").references(() => customers.id),
    serviceId: text("service_id").references(() => services.id),
    description: text("description"),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    downPaymentCents: integer("down_payment_cents"),
    installmentCount: integer("installment_count").notNull().default(1),
    deliveryDays: integer("delivery_days"),
    conditions: text("conditions"),
    notes: text("notes"),
    status: text("status", { enum: PROPOSAL_STATUS }).notNull().default("rascunho"),
    validUntil: timestamp("valid_until", { mode: "date" }),
    sentAt: timestamp("sent_at", { mode: "date" }),
    viewedAt: timestamp("viewed_at", { mode: "date" }),
    respondedAt: timestamp("responded_at", { mode: "date" }),
    ...timestamps,
  },
  (table) => [uniqueIndex("proposals_number_idx").on(table.number), index("proposals_lead_idx").on(table.leadId)],
);

export const proposalItems = pgTable(
  "proposal_items",
  {
    id: idColumn(),
    proposalId: text("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    order: integer("order").notNull().default(0),
  },
  (table) => [index("proposal_items_proposal_idx").on(table.proposalId)],
);
