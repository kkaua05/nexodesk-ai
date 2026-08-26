import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";
import { customers } from "./customers";
import { services } from "./catalog";
import { sales } from "./sales";
import { PROJECT_STATUS, TASK_STATUS, TASK_PRIORITY } from "@nexodesk/shared";

export const projects = pgTable(
  "projects",
  {
    id: idColumn(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    serviceId: text("service_id").references(() => services.id),
    saleId: text("sale_id").references(() => sales.id),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status", { enum: PROJECT_STATUS }).notNull().default("planejamento"),
    progress: integer("progress").notNull().default(0),
    valueCents: integer("value_cents"),
    responsibleUserId: text("responsible_user_id"),
    startDate: timestamp("start_date", { mode: "date" }),
    dueDate: timestamp("due_date", { mode: "date" }),
    ...timestamps,
  },
  (table) => [index("projects_customer_idx").on(table.customerId), index("projects_status_idx").on(table.status)],
);

/** Checklist stages copied from `service_stage_templates` at project creation (spec §24). */
export const projectStages = pgTable(
  "project_stages",
  {
    id: idColumn(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    order: integer("order").notNull(),
    completedAt: timestamp("completed_at", { mode: "date" }),
    ...timestamps,
  },
  (table) => [index("project_stages_project_idx").on(table.projectId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: idColumn(),
    title: text("title").notNull(),
    description: text("description"),
    projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(() => customers.id),
    responsibleUserId: text("responsible_user_id"),
    priority: text("priority", { enum: TASK_PRIORITY }).notNull().default("normal"),
    status: text("status", { enum: TASK_STATUS }).notNull().default("pendente"),
    dueDate: timestamp("due_date", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),
    ...timestamps,
  },
  (table) => [index("tasks_project_idx").on(table.projectId), index("tasks_status_idx").on(table.status)],
);
