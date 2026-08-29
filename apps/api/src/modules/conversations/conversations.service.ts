import { eq, desc } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, SOCKET_EVENTS, type MessageDirection, type MessageType, type MessageStatus } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";

export async function findOrCreateConversation(contactId: string, externalId: string) {
  const existing = (await (db.select().from(schema.conversations).where(eq(schema.conversations.externalId, externalId))))[0];
  if (existing) return existing;

  // Same atomic-insert reasoning as appendMessage() below: the provider can fire two
  // events for the same inbound message, and a plain check-then-insert races between
  // them on this conversation's unique externalId.
  const [created] = await db
    .insert(schema.conversations)
    .values({ contactId, externalId, status: "aguardando_resposta" })
    .onConflictDoNothing({ target: schema.conversations.externalId })
    .returning();

  if (created) return created;
  return (await (db.select().from(schema.conversations).where(eq(schema.conversations.externalId, externalId))))[0]!;
}

export interface AppendMessageInput {
  conversationId: string;
  externalId: string;
  direction: MessageDirection;
  type?: MessageType;
  body?: string;
  mediaUrl?: string;
  mediaFileName?: string;
  status?: MessageStatus;
  sentByUserId?: string;
}

/**
 * Idempotent on `externalId` (spec §94): reprocessing the same provider event
 * (e.g. a webhook retry) never creates a duplicate message.
 *
 * Uses an atomic `ON CONFLICT DO NOTHING` insert rather than a check-then-insert —
 * the WhatsApp provider can legitimately fire two events (`message` and
 * `message_create`) for the same inbound message with no ordering guarantee, so a
 * plain SELECT-then-INSERT has a race window where both calls pass the "does it
 * exist?" check before either commits, and the loser crashes on the unique
 * constraint instead of being recognized as a duplicate.
 */
export async function appendMessage(input: AppendMessageInput) {
  const [inserted] = await db
    .insert(schema.messages)
    .values({
      conversationId: input.conversationId,
      externalId: input.externalId,
      direction: input.direction,
      type: input.type ?? "texto",
      body: input.body,
      mediaUrl: input.mediaUrl,
      mediaFileName: input.mediaFileName,
      status: input.status ?? (input.direction === "inbound" ? "lido" : "enviado"),
      sentByUserId: input.sentByUserId,
    })
    .onConflictDoNothing({ target: schema.messages.externalId })
    .returning();

  if (!inserted) {
    const existing = (await (db.select().from(schema.messages).where(eq(schema.messages.externalId, input.externalId))))[0]!;
    return { message: existing, isNew: false };
  }
  const message = inserted;

  const preview = input.body?.slice(0, 140) ?? `[${input.type ?? "mensagem"}]`;
  // A human sending a message here is a handoff signal — the bot goes quiet on this
  // conversation from that point on, so it never talks over or contradicts the
  // attendant. It stays off until someone explicitly re-enables it for this chat.
  const isHumanTakeover = input.direction === "outbound" && !!input.sentByUserId;
  const conversation = (await (db
      .update(schema.conversations)
      .set({
        lastMessagePreview: preview,
        lastMessageAt: message.createdAt,
        unreadCount: input.direction === "inbound" ? await sqlIncrementUnread(input.conversationId) : 0,
        ...(isHumanTakeover ? { aiEnabled: false } : {}),
      })
      .where(eq(schema.conversations.id, input.conversationId))
      .returning()))[0];

  emitEvent(SOCKET_EVENTS.MESSAGE_RECEIVED, { message, conversationId: input.conversationId });
  emitEvent(SOCKET_EVENTS.CONVERSATION_UPDATED, { conversation });

  return { message, isNew: true, conversation };
}

async function sqlIncrementUnread(conversationId: string): Promise<number> {
  const current = (await (db.select().from(schema.conversations).where(eq(schema.conversations.id, conversationId))))[0];
  return (current?.unreadCount ?? 0) + 1;
}

/** Manual override for "Nexo AI responde automaticamente" — lets an attendant hand a conversation back to the bot, or silence it early. */
export async function setConversationAiEnabled(conversationId: string, enabled: boolean) {
  const updated = (await (db
      .update(schema.conversations)
      .set({ aiEnabled: enabled })
      .where(eq(schema.conversations.id, conversationId))
      .returning()))[0];
  if (!updated) throw new NotFoundError("Conversa");
  emitEvent(SOCKET_EVENTS.CONVERSATION_UPDATED, { conversation: updated });
  return updated;
}

export async function markConversationRead(conversationId: string) {
  const updated = (await (db
      .update(schema.conversations)
      .set({ unreadCount: 0 })
      .where(eq(schema.conversations.id, conversationId))
      .returning()))[0];
  if (!updated) throw new NotFoundError("Conversa");
  emitEvent(SOCKET_EVENTS.CONVERSATION_UPDATED, { conversation: updated });
  return updated;
}

export async function updateMessageStatus(externalId: string, status: MessageStatus, failureReason?: string) {
  const updated = (await (db
      .update(schema.messages)
      .set({ status, failureReason })
      .where(eq(schema.messages.externalId, externalId))
      .returning()))[0];
  if (updated) emitEvent(SOCKET_EVENTS.MESSAGE_UPDATED, { message: updated });
  return updated;
}

export async function listConversations() {
  return (await (db.select().from(schema.conversations).orderBy(desc(schema.conversations.lastMessageAt))));
}

export async function listMessages(conversationId: string) {
  return (await (db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(schema.messages.createdAt)));
}
