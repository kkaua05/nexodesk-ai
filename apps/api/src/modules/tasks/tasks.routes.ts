import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, SOCKET_EVENTS, TASK_STATUS, TASK_PRIORITY } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  projectId: z.string().optional(),
  customerId: z.string().optional(),
  responsibleUserId: z.string().optional(),
  priority: z.enum(TASK_PRIORITY).default("normal"),
  dueDate: z.coerce.date().optional(),
});

const statusSchema = z.object({ status: z.enum(TASK_STATUS) });

export async function tasksRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/tasks", async () => (await (db.select().from(schema.tasks))));

  app.post("/tasks", async (request, reply) => {
    const body = createSchema.parse(request.body);
    const task = (await (db.insert(schema.tasks).values(body).returning()))[0];
    emitEvent(SOCKET_EVENTS.TASK_CREATED, { task });
    return reply.status(201).send(task);
  });

  app.patch("/tasks/:id/status", async (request) => {
    const { id } = request.params as { id: string };
    const { status } = statusSchema.parse(request.body);
    const task = (await (db
          .update(schema.tasks)
          .set({ status, completedAt: status === "concluida" ? new Date() : null })
          .where(eq(schema.tasks.id, id))
          .returning()))[0];
    if (!task) throw new NotFoundError("Tarefa");
    emitEvent(SOCKET_EVENTS.TASK_UPDATED, { task });
    return task;
  });
}
