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

    const customers = (await (db
          .select()
          .from(schema.customers)))
      .filter((c) => c.name.toLowerCase().includes(term))
      .slice(0, 10);

    const contacts = (await (db
          .select()
          .from(schema.contacts)))
      .filter((c) => (c.name?.toLowerCase().includes(term) ?? false) || c.phoneNormalized.includes(term))
      .slice(0, 10);

    const proposals = (await (db
          .select()
          .from(schema.proposals)))
      .filter((p) => p.number.toLowerCase().includes(term))
      .slice(0, 10);

    const projects = (await (db
          .select()
          .from(schema.projects)))
      .filter((p) => p.name.toLowerCase().includes(term))
      .slice(0, 10);

    return { customers, contacts, proposals, projects };
  });
}
