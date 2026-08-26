import { pgTable, text, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";
import { customers } from "./customers";
import { leads } from "./crm";
import { services } from "./catalog";
import { proposals } from "./proposals";

/**
 * A won sale — the pivot record created transactionally by the "venda ganha" flow
 * (spec §22), fanning out into customer/project/receivables in one DB transaction.
 */
export const sales = pgTable(
  "sales",
  {
    id: idColumn(),
    number: text("number").notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    leadId: text("lead_id").references(() => leads.id),
    serviceId: text("service_id").references(() => services.id),
    proposalId: text("proposal_id").references(() => proposals.id),
    totalCents: integer("total_cents").notNull(),
    downPaymentCents: integer("down_payment_cents").notNull().default(0),
    paymentMethod: text("payment_method"),
    deliveryDays: integer("delivery_days"),
    responsibleUserId: text("responsible_user_id"),
    ...timestamps,
  },
  (table) => [uniqueIndex("sales_number_idx").on(table.number), index("sales_customer_idx").on(table.customerId)],
);
