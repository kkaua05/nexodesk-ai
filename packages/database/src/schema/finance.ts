import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";
import { customers } from "./customers";
import { projects } from "./projects";
import { sales } from "./sales";
import { RECEIVABLE_STATUS, PAYABLE_STATUS } from "@nexodesk/shared";

export const financialCategories = pgTable("financial_categories", {
  id: idColumn(),
  name: text("name").notNull(),
  type: text("type", { enum: ["receita", "despesa"] as const }).notNull(),
  ...timestamps,
});

export const accountsReceivable = pgTable(
  "accounts_receivable",
  {
    id: idColumn(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    saleId: text("sale_id").references(() => sales.id),
    projectId: text("project_id").references(() => projects.id),
    categoryId: text("category_id").references(() => financialCategories.id),
    description: text("description").notNull(),
    /** Installment N of M (spec §29) — 1/1 for a single lump-sum charge. */
    installmentNumber: integer("installment_number").notNull().default(1),
    installmentTotal: integer("installment_total").notNull().default(1),
    amountCents: integer("amount_cents").notNull(),
    paidAmountCents: integer("paid_amount_cents").notNull().default(0),
    dueDate: timestamp("due_date", { mode: "date" }).notNull(),
    paidAt: timestamp("paid_at", { mode: "date" }),
    paymentMethod: text("payment_method"),
    status: text("status", { enum: RECEIVABLE_STATUS }).notNull().default("pendente"),
    ...timestamps,
  },
  (table) => [
    index("accounts_receivable_customer_idx").on(table.customerId),
    index("accounts_receivable_due_date_idx").on(table.dueDate),
    index("accounts_receivable_status_idx").on(table.status),
  ],
);

export const accountsPayable = pgTable(
  "accounts_payable",
  {
    id: idColumn(),
    categoryId: text("category_id").references(() => financialCategories.id),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    dueDate: timestamp("due_date", { mode: "date" }).notNull(),
    paidAt: timestamp("paid_at", { mode: "date" }),
    status: text("status", { enum: PAYABLE_STATUS }).notNull().default("pendente"),
    ...timestamps,
  },
  (table) => [index("accounts_payable_due_date_idx").on(table.dueDate), index("accounts_payable_status_idx").on(table.status)],
);

/** Concrete payment postings — a receivable can receive several partial payments. */
export const payments = pgTable(
  "payments",
  {
    id: idColumn(),
    receivableId: text("receivable_id").references(() => accountsReceivable.id, { onDelete: "cascade" }),
    payableId: text("payable_id").references(() => accountsPayable.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    method: text("method"),
    paidAt: timestamp("paid_at", { mode: "date" }).notNull(),
    ...timestamps,
  },
  (table) => [index("payments_receivable_idx").on(table.receivableId)],
);
