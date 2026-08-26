import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";

const createNoteSchema = z.object({
  entityType: z.enum(["lead", "customer", "project", "proposal"]),
  entityId: z.string(),
  body: z.string().min(1),
});

const querySchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
});

export async function notesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/notes", async (request) => {
    const { entityType, entityId } = querySchema.parse(request.query);
    return (await (db
          .select()
          .from(schema.notes)
          .where(and(eq(schema.notes.entityType, entityType), eq(schema.notes.entityId, entityId)))
          .orderBy(desc(schema.notes.createdAt))));
  });

  app.post("/notes", async (request, reply) => {
    const body = createNoteSchema.parse(request.body);
    const note = (await (db
          .insert(schema.notes)
          .values({ ...body, authorUserId: request.user.sub })
          .returning()))[0];
    return reply.status(201).send(note);
  });

  app.delete("/notes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    (await (db.delete(schema.notes).where(eq(schema.notes.id, id))));
    return reply.status(204).send();
  });
}
