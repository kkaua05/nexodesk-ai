import type { FastifyInstance } from "fastify";
import { listOpenFollowUps, resolveFollowUp } from "./followups.service.js";

export async function followupsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/followups", async () => listOpenFollowUps());

  app.post("/followups/:id/resolve", async (request) => {
    const { id } = request.params as { id: string };
    return resolveFollowUp(id);
  });
}
