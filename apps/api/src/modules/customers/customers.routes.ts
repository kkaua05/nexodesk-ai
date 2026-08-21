import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { listCustomers, getCustomerById, getCustomerFinancialSummary, getCustomerTimeline } from "./customers.service.js";

export async function customersRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/customers", async () => {
    return listCustomers().map((c) => ({ ...c, financial: getCustomerFinancialSummary(c.id) }));
  });

  app.get("/customers/:id", async (request) => {
    const { id } = request.params as { id: string };
    const customer = getCustomerById(id);
    const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, customer.contactId)).get();
    return { ...customer, contact, financial: getCustomerFinancialSummary(id) };
  });

  app.get("/customers/:id/timeline", async (request) => {
    const { id } = request.params as { id: string };
    return getCustomerTimeline(id);
  });

  app.get("/customers/:id/projects", async (request) => {
    const { id } = request.params as { id: string };
    return db.select().from(schema.projects).where(eq(schema.projects.customerId, id)).all();
  });

  app.get("/customers/:id/proposals", async (request) => {
    const { id } = request.params as { id: string };
    return db.select().from(schema.proposals).where(eq(schema.proposals.customerId, id)).all();
  });

  app.get("/customers/:id/receivables", async (request) => {
    const { id } = request.params as { id: string };
    return db.select().from(schema.accountsReceivable).where(eq(schema.accountsReceivable.customerId, id)).all();
  });

  app.get("/customers/:id/notes", async (request) => {
    const { id } = request.params as { id: string };
    return db.select().from(schema.notes).where(eq(schema.notes.entityType, "customer")).all().filter((n) => n.entityId === id);
  });
}
