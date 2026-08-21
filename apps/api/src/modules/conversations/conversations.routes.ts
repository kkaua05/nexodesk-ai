import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, createId } from "@nexodesk/shared";
import { listConversations, listMessages, markConversationRead, appendMessage } from "./conversations.service.js";
import { sendWhatsappMessage } from "../whatsapp/whatsapp.service.js";
import { suggestReply } from "../ai/ai.service.js";

const sendSchema = z.object({ body: z.string().min(1) });

export async function conversationsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/conversations", async () => {
    const conversations = listConversations();
    return conversations.map((c) => {
      const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, c.contactId)).get();
      return { ...c, contact };
    });
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

    const externalId = createId();
    const { message } = appendMessage({
      conversationId: id,
      externalId,
      direction: "outbound",
      type: "texto",
      body,
      status: "enviando",
      sentByUserId: request.user.sub,
    });

    try {
      await sendWhatsappMessage(contact.phoneNormalized, body);
      db.update(schema.messages).set({ status: "enviado" }).where(eq(schema.messages.id, message.id)).run();
    } catch (error) {
      db.update(schema.messages)
        .set({ status: "falhou", failureReason: (error as Error).message })
        .where(eq(schema.messages.id, message.id))
        .run();
    }

    return reply.status(201).send(db.select().from(schema.messages).where(eq(schema.messages.id, message.id)).get());
  });

  app.get("/conversations/:id/ai-suggestion", async (request) => {
    const { id } = request.params as { id: string };
    const reply = await suggestReply(id);
    return { reply };
  });
}
