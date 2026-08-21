import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { idColumn, timestamps } from "./_helpers";

export const services = sqliteTable("services", {
  id: idColumn(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  basePriceCents: integer("base_price_cents").notNull(),
  minPriceCents: integer("min_price_cents").notNull(),
  averageDeliveryDays: integer("average_delivery_days"),
  suggestedDownPaymentCents: integer("suggested_down_payment_cents"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

/** Reusable stage checklist per service (spec §24), copied into a project when it's created. */
export const serviceStageTemplates = sqliteTable("service_stage_templates", {
  id: idColumn(),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  ...timestamps,
});
