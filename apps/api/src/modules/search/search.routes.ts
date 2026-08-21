import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";

const querySchema = z.object({ q: z.string().min(1) });

export async function searchRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/search", async (request) => {
    const { q } = querySchema.parse(request.query);
    const term = q.toLowerCase();

    const customers = db
      .select()
      .from(schema.customers)
      .all()
      .filter((c) => c.name.toLowerCase().includes(term))
      .slice(0, 10);

    const contacts = db
      .select()
      .from(schema.contacts)
      .all()
      .filter((c) => (c.name?.toLowerCase().includes(term) ?? false) || c.phoneNormalized.includes(term))
      .slice(0, 10);

    const proposals = db
      .select()
      .from(schema.proposals)
      .all()
      .filter((p) => p.number.toLowerCase().includes(term))
      .slice(0, 10);

    const projects = db
      .select()
      .from(schema.projects)
      .all()
      .filter((p) => p.name.toLowerCase().includes(term))
      .slice(0, 10);

    return { customers, contacts, proposals, projects };
  });
}
