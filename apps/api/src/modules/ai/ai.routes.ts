import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { askNexoAI } from "./nexo-ai.service.js";
import { aiProvider } from "./ai.service.js";

const askSchema = z.object({ question: z.string().min(3) });

export async function aiRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.post("/ai/ask", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request) => {
    const { question } = askSchema.parse(request.body);
    return askNexoAI(question);
  });

  app.get("/ai/status", async () => {
    const available = await aiProvider.isAvailable();
    return { available, model: aiProvider.modelName };
  });
}
