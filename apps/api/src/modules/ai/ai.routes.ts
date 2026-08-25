import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { askNexoAI } from "./nexo-ai.service.js";
import { aiProvider, aiProviderName } from "./ai.service.js";

const askSchema = z.object({
  question: z.string().min(3),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .default([]),
});

export async function aiRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.post("/ai/ask", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request) => {
    const { question, history } = askSchema.parse(request.body);
    return askNexoAI(question, history);
  });

  app.get("/ai/status", async () => {
    const available = await aiProvider.isAvailable();
    return { available, model: aiProvider.modelName, provider: aiProviderName };
  });
}
