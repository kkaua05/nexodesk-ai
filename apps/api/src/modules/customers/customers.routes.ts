import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { listCustomers, getCustomerById, getCustomerFinancialSummary, getCustomerTimeline, createCustomer } from "./customers.service.js";

const createCustomerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional(),
  company: z.string().optional(),
  document: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function customersRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/customers", async () => {
    const customers = await listCustomers();
    return Promise.all(customers.map(async (c) => ({ ...c, financial: await getCustomerFinancialSummary(c.id) })));
  });

  app.post("/customers", async (request, reply) => {
    const body = createCustomerSchema.parse(request.body);
    const customer = await createCustomer(body);
    return reply.status(201).send(customer);
  });

  app.get("/customers/:id", async (request) => {
    const { id } = request.params as { id: string };
    const customer = await getCustomerById(id);
    const contact = (await (db.select().from(schema.contacts).where(eq(schema.contacts.id, customer.contactId))))[0];
    return { ...customer, contact, financial: await getCustomerFinancialSummary(id) };
  });

  app.get("/customers/:id/timeline", async (request) => {
    const { id } = request.params as { id: string };
    return getCustomerTimeline(id);
  });

  app.get("/customers/:id/projects", async (request) => {
    const { id } = request.params as { id: string };
    return (await (db.select().from(schema.projects).where(eq(schema.projects.customerId, id))));
  });

  app.get("/customers/:id/proposals", async (request) => {
    const { id } = request.params as { id: string };
    return (await (db.select().from(schema.proposals).where(eq(schema.proposals.customerId, id))));
  });

  app.get("/customers/:id/receivables", async (request) => {
    const { id } = request.params as { id: string };
    return (await (db.select().from(schema.accountsReceivable).where(eq(schema.accountsReceivable.customerId, id))));
  });

  app.get("/customers/:id/notes", async (request) => {
    const { id } = request.params as { id: string };
    return (await (db.select().from(schema.notes).where(eq(schema.notes.entityType, "customer")))).filter((n) => n.entityId === id);
  });
}
