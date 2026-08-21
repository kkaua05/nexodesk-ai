import type { IncomingMessageEvent, MessageAckEvent, MessagingProvider } from "./messaging-provider.js";
import { findOrCreateContact } from "../contacts/contacts.service.js";
import { createLeadForContact, findActiveLeadByContact, applyScoreEvent } from "../leads/leads.service.js";
import { findOrCreateConversation, appendMessage, updateMessageStatus } from "../conversations/conversations.service.js";
import { runAutomation } from "../automations/automations.service.js";
import { analyzeConversation, extractLeadData } from "../ai/ai.service.js";
import { emitEvent } from "../../shared/realtime.js";
import { SOCKET_EVENTS } from "@nexodesk/shared";

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

  provider.on("ack", (event: MessageAckEvent) => {
    updateMessageStatus(event.externalMessageId, event.status, event.failureReason);
  });
}

async function handleIncomingMessage(event: IncomingMessageEvent) {
  const { contact, isNew: isNewContact } = findOrCreateContact({
    phone: event.fromPhone,
    name: event.fromName,
    avatarUrl: event.avatarUrl,
    firstMessageAt: event.timestamp,
  });

  if (isNewContact) {
    emitEvent(SOCKET_EVENTS.CONTACT_CREATED, { contact });
  }

  const conversation = findOrCreateConversation(contact.id, event.externalChatId);

  const { message, isNew: isNewMessage } = appendMessage({
    conversationId: conversation.id,
    externalId: event.externalMessageId,
    direction: "inbound",
    type: event.type,
    body: event.body,
    mediaUrl: event.mediaUrl,
    status: "lido",
  });

  if (!isNewMessage) return; // duplicate provider event — already processed (spec §94)

  let lead = findActiveLeadByContact(contact.id);

  if (!lead) {
    lead = await runAutomation("lead_auto_create", { type: "contact", id: contact.id }, () =>
      createLeadForContact({ contactId: contact.id, firstMessage: event.body }),
    );
  } else if (event.body) {
    applyScoreEvent(lead.id, "respondeu_rapido", "Respondeu a uma mensagem recebida");
  }

  if (!lead || !event.body) return;

  await runAutomation("lead_ai_analysis", { type: "lead", id: lead.id }, async () => {
    await analyzeConversation(conversation.id, lead!.id, event.body!);
    await extractLeadData(conversation.id, lead!.id);
  });
}
