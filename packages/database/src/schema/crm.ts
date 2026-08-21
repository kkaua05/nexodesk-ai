import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { idColumn, timestamps } from "./_helpers";
import { contacts } from "./whatsapp";
import { services } from "./catalog";
import { LEAD_STATUS, LEAD_ORIGIN, PIPELINE_STAGE } from "@nexodesk/shared";

export const leads = sqliteTable(
  "leads",
  {
    id: idColumn(),
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    serviceId: text("service_id").references(() => services.id),
    status: text("status", { enum: LEAD_STATUS }).notNull().default("novo"),
    origin: text("origin", { enum: LEAD_ORIGIN }).notNull().default("whatsapp"),
    score: integer("score").notNull().default(0),
    potentialValueCents: integer("potential_value_cents"),
    responsibleUserId: text("responsible_user_id"),
    firstMessage: text("first_message"),
    nextAction: text("next_action"),
    nextActionAt: integer("next_action_at", { mode: "timestamp_ms" }),
    lostReason: text("lost_reason"),
    ...timestamps,
  },
  (table) => [
    index("leads_contact_idx").on(table.contactId),
    index("leads_status_idx").on(table.status),
  ],
);

/** Score-affecting events, additive audit trail behind the lead-score engine (spec §16). */
export const leadEvents = sqliteTable(
  "lead_events",
  {
    id: idColumn(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    scoreDelta: integer("score_delta").notNull().default(0),
    description: text("description"),
    metadata: text("metadata", { mode: "json" }),
    ...timestamps,
  },
  (table) => [index("lead_events_lead_idx").on(table.leadId)],
);

export const tags = sqliteTable("tags", {
  id: idColumn(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#5B2EFF"),
  ...timestamps,
});

export const leadTags = sqliteTable(
  "lead_tags",
  {
    id: idColumn(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [index("lead_tags_lead_idx").on(table.leadId)],
);

export const pipelineStages = sqliteTable("pipeline_stages", {
  id: idColumn(),
  key: text("key", { enum: PIPELINE_STAGE }).notNull().unique(),
  label: text("label").notNull(),
  order: integer("order").notNull(),
  ...timestamps,
});

export const opportunities = sqliteTable(
  "opportunities",
  {
    id: idColumn(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    stageKey: text("stage_key", { enum: PIPELINE_STAGE }).notNull().default("novo_lead"),
    valueCents: integer("value_cents"),
    order: integer("order").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("opportunities_stage_idx").on(table.stageKey)],
);

export const opportunityHistory = sqliteTable(
  "opportunity_history",
  {
    id: idColumn(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    fromStage: text("from_stage", { enum: PIPELINE_STAGE }),
    toStage: text("to_stage", { enum: PIPELINE_STAGE }).notNull(),
    movedByUserId: text("moved_by_user_id"),
    ...timestamps,
  },
  (table) => [index("opportunity_history_opportunity_idx").on(table.opportunityId)],
);
