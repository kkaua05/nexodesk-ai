import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { registerReceivablePayment, registerPayablePayment, getFinancialOverview } from "./finance.service.js";

const paymentSchema = z.object({ amountCents: z.number().int().positive(), method: z.string().optional() });
const payableSchema = z.object({
  categoryId: z.string().optional(),
  description: z.string().min(2),
  amountCents: z.number().int().positive(),
  dueDate: z.coerce.date(),
});

export async function financeRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/finance/overview", async () => getFinancialOverview());

  app.get("/finance/receivables", async () => db.select().from(schema.accountsReceivable).all());
  app.get("/finance/payables", async () => db.select().from(schema.accountsPayable).all());
  app.get("/finance/categories", async () => db.select().from(schema.financialCategories).all());

  app.post("/finance/receivables/:id/pay", async (request) => {
    const { id } = request.params as { id: string };
    const { amountCents, method } = paymentSchema.parse(request.body);
    return registerReceivablePayment(id, amountCents, method);
  });

  app.post("/finance/payables", { onRequest: [app.authenticate, app.requireRole("owner", "financeiro")] }, async (request, reply) => {
    const body = payableSchema.parse(request.body);
    const payable = db.insert(schema.accountsPayable).values(body).returning().get();
    return reply.status(201).send(payable);
  });

  app.post("/finance/payables/:id/pay", { onRequest: [app.authenticate, app.requireRole("owner", "financeiro")] }, async (request) => {
    const { id } = request.params as { id: string };
    return registerPayablePayment(id);
  });
}
