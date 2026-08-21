import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { closeSale } from "./sales.service.js";

const closeSaleSchema = z.object({
  leadId: z.string(),
  serviceId: z.string(),
  proposalId: z.string().optional(),
  totalCents: z.number().int().positive(),
  downPaymentCents: z.number().int().nonnegative().default(0),
  installmentCount: z.number().int().positive().default(1),
  paymentMethod: z.string().min(2),
  deliveryDays: z.number().int().positive().default(15),
});

export async function salesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/sales", async () => db.select().from(schema.sales).all());

  app.post("/sales/close", async (request, reply) => {
    const body = closeSaleSchema.parse(request.body);
    const result = closeSale({ ...body, responsibleUserId: request.user.sub });
    return reply.status(201).send(result);
  });
}
