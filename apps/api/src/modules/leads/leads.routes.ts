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
    const leads = await listLeads();
    return Promise.all(
      leads.map(async (lead) => {
        const contact = (await (db.select().from(schema.contacts).where(eq(schema.contacts.id, lead.contactId))))[0];
        const service = lead.serviceId ? (await (db.select().from(schema.services).where(eq(schema.services.id, lead.serviceId))))[0] : undefined;
        return { ...lead, contact, service };
      }),
    );
  });

  app.get("/leads/:id", async (request) => {
    const { id } = request.params as { id: string };
    const lead = await getLeadById(id);
    const contact = (await (db.select().from(schema.contacts).where(eq(schema.contacts.id, lead.contactId))))[0];
    const tags = (await (db
          .select({ tag: schema.tags })
          .from(schema.leadTags)
          .innerJoin(schema.tags, eq(schema.leadTags.tagId, schema.tags.id))
          .where(eq(schema.leadTags.leadId, id))))
      .map((r) => r.tag);
    const events = (await (db.select().from(schema.leadEvents).where(eq(schema.leadEvents.leadId, id))));
    const memories = (await (db.select().from(schema.aiMemories).where(eq(schema.aiMemories.leadId, id))));
    return { ...lead, contact, tags, events, memories };
  });

  app.patch("/leads/:id/status", async (request) => {
    const { id } = request.params as { id: string };
    const { status } = updateStatusSchema.parse(request.body);
    return updateLeadStatus(id, status);
  });
}
