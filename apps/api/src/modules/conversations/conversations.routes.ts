import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createReadStream } from "node:fs";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, ValidationError } from "@nexodesk/shared";
import { listConversations, listMessages, markConversationRead, appendMessage, findOrCreateConversation } from "./conversations.service.js";
import { sendWhatsappMessage, sendWhatsappMedia } from "../whatsapp/whatsapp.service.js";
import { findOrCreateContact } from "../contacts/contacts.service.js";
import { suggestReply } from "../ai/ai.service.js";
import { saveMediaBase64, mediaFilePath } from "../../shared/media-storage.js";

const sendSchema = z.object({ body: z.string().min(1) });

const startConversationSchema = z.object({
  phone: z.string().min(8),
  name: z.string().optional(),
  message: z.string().optional(),
});

const MEDIA_TYPE_BY_MIME = (mime: string): "imagem" | "audio" | "video" | "documento" => {
  if (mime.startsWith("image/")) return "imagem";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "documento";
};

export async function conversationsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/conversations", async () => {
    const conversations = listConversations();
    return conversations.map((c) => {
      const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, c.contactId)).get();
      return { ...c, contact };
    });
  });

  /** "Adicionar contato" / iniciar conversa com um número que ainda não escreveu (spec: controle total do WhatsApp pelo sistema). */
  app.post("/conversations", async (request, reply) => {
    const { phone, name, message } = startConversationSchema.parse(request.body);

    const { contact } = findOrCreateContact({ phone, name, firstMessageAt: new Date() });
    const conversation = findOrCreateConversation(contact.id, `${contact.phoneNormalized.replace("+", "")}@c.us`);

    if (message) {
      const { externalId } = await sendWhatsappMessage(contact.phoneNormalized, message);
      appendMessage({
        conversationId: conversation.id,
        externalId,
        direction: "outbound",
        type: "texto",
        body: message,
        status: "enviado",
        sentByUserId: request.user.sub,
      });
    }

    return reply.status(201).send({ ...conversation, contact });
  });

  app.get("/conversations/:id/messages", async (request) => {
    const { id } = request.params as { id: string };
    return listMessages(id);
  });

  app.post("/conversations/:id/read", async (request) => {
    const { id } = request.params as { id: string };
    return markConversationRead(id);
  });

  app.post("/conversations/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { body } = sendSchema.parse(request.body);

    const conversation = db.select().from(schema.conversations).where(eq(schema.conversations.id, id)).get();
    if (!conversation) throw new NotFoundError("Conversa");

    const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, conversation.contactId)).get();
    if (!contact) throw new NotFoundError("Contato");

    // Real WhatsApp id up front lets message_ack (delivered/read receipts) match this row later.
    const { externalId } = await sendWhatsappMessage(contact.phoneNormalized, body).catch((error) => {
      throw new ValidationError(`Não foi possível enviar a mensagem: ${(error as Error).message}`);
    });

    const { message } = appendMessage({
      conversationId: id,
      externalId,
      direction: "outbound",
      type: "texto",
      body,
      status: "enviado",
      sentByUserId: request.user.sub,
    });

    return reply.status(201).send(message);
  });

  /** Envio de arquivos/imagens/áudio pelo WhatsApp (upload multipart → mídia real enviada). */
  app.post("/conversations/:id/media", async (request, reply) => {
    const { id } = request.params as { id: string };
    const conversation = db.select().from(schema.conversations).where(eq(schema.conversations.id, id)).get();
    if (!conversation) throw new NotFoundError("Conversa");

    const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, conversation.contactId)).get();
    if (!contact) throw new NotFoundError("Contato");

    const file = await request.file({ limits: { fileSize: 30 * 1024 * 1024 } });
    if (!file) throw new ValidationError("Nenhum arquivo enviado");

    const caption = (file.fields.caption as { value?: string } | undefined)?.value;
    const buffer = await file.toBuffer();
    const base64 = buffer.toString("base64");

    const { externalId } = await sendWhatsappMedia(contact.phoneNormalized, {
      base64,
      mimeType: file.mimetype,
      fileName: file.filename,
      caption,
    }).catch((error) => {
      throw new ValidationError(`Não foi possível enviar o arquivo: ${(error as Error).message}`);
    });

    const mediaPath = saveMediaBase64(base64, file.mimetype, file.filename);

    const { message } = appendMessage({
      conversationId: id,
      externalId,
      direction: "outbound",
      type: MEDIA_TYPE_BY_MIME(file.mimetype),
      body: caption,
      mediaUrl: mediaPath,
      mediaFileName: file.filename,
      status: "enviado",
      sentByUserId: request.user.sub,
    });

    return reply.status(201).send(message);
  });

  /** Abrir/baixar um arquivo recebido ou enviado pelo WhatsApp. */
  app.get("/conversations/messages/:messageId/media", async (request, reply) => {
    const { messageId } = request.params as { messageId: string };
    const message = db.select().from(schema.messages).where(eq(schema.messages.id, messageId)).get();
    if (!message || !message.mediaUrl) throw new NotFoundError("Arquivo");

    return reply.type(guessMimeFromExtension(message.mediaUrl)).send(createReadStream(mediaFilePath(message.mediaUrl)));
  });

  app.get("/conversations/:id/ai-suggestion", async (request) => {
    const { id } = request.params as { id: string };
    const reply = await suggestReply(id);
    return { reply };
  });
}

function guessMimeFromExtension(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    ogg: "audio/ogg",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    pdf: "application/pdf",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}
