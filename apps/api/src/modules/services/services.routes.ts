import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError } from "@nexodesk/shared";

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string().min(2),
  basePriceCents: z.number().int().nonnegative(),
  minPriceCents: z.number().int().nonnegative(),
  averageDeliveryDays: z.number().int().positive().optional(),
  suggestedDownPaymentCents: z.number().int().nonnegative().optional(),
});

export async function servicesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/services", async () => (await (db.select().from(schema.services))));

  app.get("/services/:id/stages", async (request) => {
    const { id } = request.params as { id: string };
    return (await (db.select().from(schema.serviceStageTemplates).where(eq(schema.serviceStageTemplates.serviceId, id))));
  });

  app.post("/services", { onRequest: [app.authenticate, app.requireRole("owner", "admin")] }, async (request, reply) => {
    const body = serviceSchema.parse(request.body);
    const service = (await (db.insert(schema.services).values(body).returning()))[0];
    return reply.status(201).send(service);
  });

  app.patch("/services/:id", { onRequest: [app.authenticate, app.requireRole("owner", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = serviceSchema.partial().parse(request.body);
    const service = (await (db.update(schema.services).set(body).where(eq(schema.services.id, id)).returning()))[0];
    if (!service) throw new NotFoundError("Serviço");
    return service;
  });

  app.patch("/services/:id/toggle", { onRequest: [app.authenticate, app.requireRole("owner", "admin")] }, async (request) => {
    const { id } = request.params as { id: string };
    const current = (await (db.select().from(schema.services).where(eq(schema.services.id, id))))[0];
    if (!current) throw new NotFoundError("Serviço");
    return (await (db.update(schema.services).set({ isActive: !current.isActive }).where(eq(schema.services.id, id)).returning()))[0];
  });
}
