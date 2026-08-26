import type { IncomingMessageEvent, MessageAckEvent, MessagingProvider } from "./messaging-provider.js";
import { findOrCreateContact } from "../contacts/contacts.service.js";
import { createLeadForContact, findActiveLeadByContact, applyScoreEvent } from "../leads/leads.service.js";
import { findOrCreateConversation, appendMessage, updateMessageStatus } from "../conversations/conversations.service.js";
import { runAutomation } from "../automations/automations.service.js";
import { analyzeConversation, extractLeadData, suggestReply } from "../ai/ai.service.js";
import { sendWhatsappMessage } from "./whatsapp.service.js";
import { createNotification } from "../notifications/notifications.service.js";
import { emitEvent } from "../../shared/realtime.js";
import { SOCKET_EVENTS } from "@nexodesk/shared";
import { saveMediaBase64 } from "../../shared/media-storage.js";

/**
 * Central inbound flow (spec §1 / §88):
 *   WhatsApp → provider → this handler → contact dedup → lead create/update →
 *   AI analysis → DB → realtime → frontend.
 */
export function registerMessageHandler(provider: MessagingProvider) {
  provider.on("message", async (event: IncomingMessageEvent) => {
    try {
      await handleIncomingMessage(event);
    } catch (error) {
      console.error("[whatsapp] falha ao processar mensagem recebida:", error);
    }
  });

  provider.on("ack", async (event: MessageAckEvent) => {
    try {
      await updateMessageStatus(event.externalMessageId, event.status, event.failureReason);
    } catch (error) {
      console.error("[whatsapp] falha ao processar confirmação de entrega:", error);
    }
  });
}

async function handleIncomingMessage(event: IncomingMessageEvent) {
  const { contact, isNew: isNewContact } = await findOrCreateContact({
    phone: event.fromPhone,
    name: event.fromName,
    avatarUrl: event.avatarUrl,
    firstMessageAt: event.timestamp,
  });
  if (!contact) return;

  if (isNewContact) {
    emitEvent(SOCKET_EVENTS.CONTACT_CREATED, { contact });
  }

  const conversation = await findOrCreateConversation(contact.id, event.externalChatId);
  if (!conversation) return;

  const mediaPath = event.media ? saveMediaBase64(event.media.base64, event.media.mimeType, event.media.fileName) : undefined;

  const { message, isNew: isNewMessage } = await appendMessage({
    conversationId: conversation.id,
    externalId: event.externalMessageId,
    direction: "inbound",
    type: event.type,
    body: event.body,
    mediaUrl: mediaPath,
    mediaFileName: event.media?.fileName,
    status: "lido",
  });
  void message;

  if (!isNewMessage) return; // duplicate provider event — already processed (spec §94)

  await createNotification({
    type: "nova_mensagem",
    title: `Nova mensagem de ${contact.name ?? contact.phoneNormalized}`,
    body: event.body?.slice(0, 140),
    entityType: "conversation",
    entityId: conversation.id,
  });

  let lead = await findActiveLeadByContact(contact.id);

  if (!lead) {
    lead = await runAutomation("lead_auto_create", { type: "contact", id: contact.id }, () =>
      createLeadForContact({ contactId: contact.id, firstMessage: event.body }),
    );
  } else if (event.body) {
    await applyScoreEvent(lead.id, "respondeu_rapido", "Respondeu a uma mensagem recebida");
  }

  if (!lead || !event.body) return;

  await runAutomation("lead_ai_analysis", { type: "lead", id: lead.id }, async () => {
    await analyzeConversation(conversation.id, lead!.id, event.body!);
    await extractLeadData(conversation.id, lead!.id);
  });

  // Off the moment a human sends a message in this conversation (see appendMessage's
  // isHumanTakeover) — the bot never talks over an attendant, and stays quiet on a
  // conversation someone already took ownership of until it's explicitly reopened.
  if (!conversation.aiEnabled) return;

  await runAutomation("whatsapp_ai_auto_reply", { type: "conversation", id: conversation.id }, async () => {
    const reply = await suggestReply(conversation.id);
    if (!reply) return; // AI offline/unavailable — safeAI() already returned null, stay silent rather than guess

    const { externalId } = await sendWhatsappMessage(contact.phoneNormalized, reply);
    await appendMessage({ conversationId: conversation.id, externalId, direction: "outbound", type: "texto", body: reply, status: "enviado" });
  });
}
