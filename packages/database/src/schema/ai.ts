import { pgTable, text, jsonb, index } from "drizzle-orm/pg-core";
import { idColumn, timestamps } from "./_helpers";
import { conversations } from "./whatsapp";
import { leads } from "./crm";
import { customers } from "./customers";

/** Structured output of intent classification / data extraction (spec §36-37) — always validated before use. */
export const aiAnalyses = pgTable(
  "ai_analyses",
  {
    id: idColumn(),
    conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    intent: text("intent"),
    service: text("service"),
    urgency: text("urgency"),
    sentiment: text("sentiment"),
    extractedData: jsonb("extracted_data"),
    model: text("model").notNull(),
    ...timestamps,
  },
  (table) => [index("ai_analyses_conversation_idx").on(table.conversationId)],
);

export const aiSummaries = pgTable(
  "ai_summaries",
  {
    id: idColumn(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    nextStep: text("next_step"),
    model: text("model").notNull(),
    ...timestamps,
  },
  (table) => [index("ai_summaries_conversation_idx").on(table.conversationId)],
);

/** "Memória IA" (spec §40) — a fact or an inference about a customer, explicitly labeled. */
export const aiMemories = pgTable(
  "ai_memories",
  {
    id: idColumn(),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    kind: text("kind", { enum: ["fato", "inferencia"] as const }).notNull(),
    sourceConversationId: text("source_conversation_id").references(() => conversations.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [index("ai_memories_customer_idx").on(table.customerId)],
);
