import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { idColumn, timestamps } from "./_helpers";
import { customers } from "./customers";
import { services } from "./catalog";
import { sales } from "./sales";
import { PROJECT_STATUS, TASK_STATUS, TASK_PRIORITY } from "@nexodesk/shared";

export const projects = sqliteTable(
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
    startDate: integer("start_date", { mode: "timestamp_ms" }),
    dueDate: integer("due_date", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [index("projects_customer_idx").on(table.customerId), index("projects_status_idx").on(table.status)],
);

/** Checklist stages copied from `service_stage_templates` at project creation (spec §24). */
export const projectStages = sqliteTable(
  "project_stages",
  {
    id: idColumn(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    order: integer("order").notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [index("project_stages_project_idx").on(table.projectId)],
);

export const tasks = sqliteTable(
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
    dueDate: integer("due_date", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [index("tasks_project_idx").on(table.projectId), index("tasks_status_idx").on(table.status)],
);
