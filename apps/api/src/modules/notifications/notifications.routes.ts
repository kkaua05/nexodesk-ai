import type { FastifyInstance } from "fastify";
import { listNotifications, markNotificationRead } from "./notifications.service.js";

export async function notificationsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/notifications", async (request) => listNotifications(request.user.sub));

  app.post("/notifications/:id/read", async (request) => {
    const { id } = request.params as { id: string };
    return markNotificationRead(id);
  });
}
