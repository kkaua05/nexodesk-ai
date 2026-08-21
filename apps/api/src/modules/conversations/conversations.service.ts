import { eq, desc } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, SOCKET_EVENTS, type MessageDirection, type MessageType, type MessageStatus } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";

export function findOrCreateConversation(contactId: string, externalId: string) {
  const existing = db.select().from(schema.conversations).where(eq(schema.conversations.externalId, externalId)).get();
  if (existing) return existing;

  return db
    .insert(schema.conversations)
    .values({ contactId, externalId, status: "aguardando_resposta" })
    .returning()
    .get();
}

export interface AppendMessageInput {
  conversationId: string;
  externalId: string;
  direction: MessageDirection;
  type?: MessageType;
  body?: string;
  mediaUrl?: string;
  status?: MessageStatus;
  sentByUserId?: string;
}

/**
 * Idempotent on `externalId` (spec §94): reprocessing the same provider event
 * (e.g. a webhook retry) never creates a duplicate message.
 */
export function appendMessage(input: AppendMessageInput) {
  const existing = db.select().from(schema.messages).where(eq(schema.messages.externalId, input.externalId)).get();
  if (existing) return { message: existing, isNew: false };

  const message = db
    .insert(schema.messages)
    .values({
      conversationId: input.conversationId,
      externalId: input.externalId,
      direction: input.direction,
      type: input.type ?? "texto",
      body: input.body,
      mediaUrl: input.mediaUrl,
      status: input.status ?? (input.direction === "inbound" ? "lido" : "enviado"),
      sentByUserId: input.sentByUserId,
    })
    .returning()
    .get();

  const preview = input.body?.slice(0, 140) ?? `[${input.type ?? "mensagem"}]`;
  const conversation = db
    .update(schema.conversations)
    .set({
      lastMessagePreview: preview,
      lastMessageAt: message.createdAt,
      unreadCount: input.direction === "inbound" ? sqlIncrementUnread(input.conversationId) : 0,
    })
    .where(eq(schema.conversations.id, input.conversationId))
    .returning()
    .get();

  emitEvent(SOCKET_EVENTS.MESSAGE_RECEIVED, { message, conversationId: input.conversationId });
  emitEvent(SOCKET_EVENTS.CONVERSATION_UPDATED, { conversation });

  return { message, isNew: true, conversation };
}

function sqlIncrementUnread(conversationId: string): number {
  const current = db.select().from(schema.conversations).where(eq(schema.conversations.id, conversationId)).get();
  return (current?.unreadCount ?? 0) + 1;
}

export function markConversationRead(conversationId: string) {
  const updated = db
    .update(schema.conversations)
    .set({ unreadCount: 0 })
    .where(eq(schema.conversations.id, conversationId))
    .returning()
    .get();
  if (!updated) throw new NotFoundError("Conversa");
  emitEvent(SOCKET_EVENTS.CONVERSATION_UPDATED, { conversation: updated });
  return updated;
}

export function updateMessageStatus(externalId: string, status: MessageStatus, failureReason?: string) {
  const updated = db
    .update(schema.messages)
    .set({ status, failureReason })
    .where(eq(schema.messages.externalId, externalId))
    .returning()
    .get();
  if (updated) emitEvent(SOCKET_EVENTS.MESSAGE_UPDATED, { message: updated });
  return updated;
}

export function listConversations() {
  return db.select().from(schema.conversations).orderBy(desc(schema.conversations.lastMessageAt)).all();
}

export function listMessages(conversationId: string) {
  return db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .orderBy(schema.messages.createdAt)
    .all();
}
