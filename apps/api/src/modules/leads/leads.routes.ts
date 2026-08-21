import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { LEAD_STATUS } from "@nexodesk/shared";
import { listLeads, getLeadById, updateLeadStatus } from "./leads.service.js";

const updateStatusSchema = z.object({ status: z.enum(LEAD_STATUS) });

export async function leadsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/leads", async () => {
    const leads = listLeads();
    return leads.map((lead) => {
      const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, lead.contactId)).get();
      const service = lead.serviceId ? db.select().from(schema.services).where(eq(schema.services.id, lead.serviceId)).get() : undefined;
      return { ...lead, contact, service };
    });
  });

  app.get("/leads/:id", async (request) => {
    const { id } = request.params as { id: string };
    const lead = getLeadById(id);
    const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, lead.contactId)).get();
    const tags = db
      .select({ tag: schema.tags })
      .from(schema.leadTags)
      .innerJoin(schema.tags, eq(schema.leadTags.tagId, schema.tags.id))
      .where(eq(schema.leadTags.leadId, id))
      .all()
      .map((r) => r.tag);
    const events = db.select().from(schema.leadEvents).where(eq(schema.leadEvents.leadId, id)).all();
    const memories = db.select().from(schema.aiMemories).where(eq(schema.aiMemories.leadId, id)).all();
    return { ...lead, contact, tags, events, memories };
  });

  app.patch("/leads/:id/status", async (request) => {
    const { id } = request.params as { id: string };
    const { status } = updateStatusSchema.parse(request.body);
    return updateLeadStatus(id, status);
  });
}
