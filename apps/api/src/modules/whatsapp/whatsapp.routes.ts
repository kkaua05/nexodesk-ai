import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ValidationError } from "@nexodesk/shared";
import {
  connectWhatsapp,
  disconnectWhatsapp,
  clearWhatsappSession,
  getWhatsappStatus,
  getLastQrCode,
  sendWhatsappMessage,
} from "./whatsapp.service.js";
import { translateWhatsappSendError } from "./send-error.js";

const sendMessageSchema = z.object({
  recipient: z.string().min(8),
  message: z.string().min(1),
});

export async function whatsappRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/whatsapp/status", async () => {
    const status = await getWhatsappStatus();
    return { ...status, qr: status.status === "qr_necessario" ? getLastQrCode() : undefined };
  });

  app.post("/whatsapp/connect", async (_request, reply) => {
    await connectWhatsapp().catch((error) => {
      throw new ValidationError(translateWhatsappSendError(error));
    });
    return reply.status(202).send({ message: "Conexão iniciada" });
  });

  app.post("/whatsapp/disconnect", async (_request, reply) => {
    await disconnectWhatsapp();
    return reply.status(200).send({ message: "Desconectado" });
  });

  app.post("/whatsapp/clear-session", { onRequest: [app.authenticate, app.requireRole("owner", "admin")] }, async (_request, reply) => {
    await clearWhatsappSession();
    return reply.status(200).send({ message: "Sessão limpa" });
  });

  app.post(
    "/whatsapp/send",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { recipient, message } = sendMessageSchema.parse(request.body);
      await sendWhatsappMessage(recipient, message);
      return reply.status(202).send({ message: "Mensagem enviada" });
    },
  );
}
