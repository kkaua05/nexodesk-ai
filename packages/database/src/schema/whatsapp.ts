import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { idColumn, timestamps } from "./_helpers";
import { CONVERSATION_STATUS, MESSAGE_DIRECTION, MESSAGE_STATUS, MESSAGE_TYPE } from "@nexodesk/shared";

export const contacts = sqliteTable(
  "contacts",
  {
    id: idColumn(),
    name: text("name"),
    phoneRaw: text("phone_raw").notNull(),
    /** E.164 — unique key used to dedupe across all channels (spec §12). */
    phoneNormalized: text("phone_normalized").notNull(),
    countryCode: text("country_code"),
    callingCode: text("calling_code"),
    avatarUrl: text("avatar_url"),
    email: text("email"),
    firstContactAt: integer("first_contact_at", { mode: "timestamp_ms" }).notNull(),
    lastContactAt: integer("last_contact_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("contacts_phone_normalized_idx").on(table.phoneNormalized)],
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: idColumn(),
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    /** External WhatsApp chat id (JID) — kept to correlate with provider events. */
    externalId: text("external_id").notNull(),
    status: text("status", { enum: CONVERSATION_STATUS }).notNull().default("aguardando_resposta"),
    unreadCount: integer("unread_count").notNull().default(0),
    lastMessagePreview: text("last_message_preview"),
    lastMessageAt: integer("last_message_at", { mode: "timestamp_ms" }),
    assignedUserId: text("assigned_user_id"),
    /** Nexo AI auto-reply for this conversation — turned off automatically the moment a human sends a message here. */
    aiEnabled: integer("ai_enabled", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("conversations_external_id_idx").on(table.externalId),
    index("conversations_contact_idx").on(table.contactId),
    index("conversations_last_message_idx").on(table.lastMessageAt),
  ],
);

export const messages = sqliteTable(
  "messages",
  {
    id: idColumn(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    /** Provider message id — unique constraint prevents double-processing the same webhook/event (spec §94). */
    externalId: text("external_id").notNull(),
    direction: text("direction", { enum: MESSAGE_DIRECTION }).notNull(),
    type: text("type", { enum: MESSAGE_TYPE }).notNull().default("texto"),
    body: text("body"),
    mediaUrl: text("media_url"),
    mediaFileName: text("media_file_name"),
    status: text("status", { enum: MESSAGE_STATUS }).notNull().default("enviado"),
    sentByUserId: text("sent_by_user_id"),
    failureReason: text("failure_reason"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("messages_external_id_idx").on(table.externalId),
    index("messages_conversation_idx").on(table.conversationId),
  ],
);
