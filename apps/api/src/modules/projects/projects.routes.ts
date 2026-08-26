import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, SOCKET_EVENTS, PROJECT_STATUS } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";
import { createProject } from "./projects.service.js";

const statusSchema = z.object({ status: z.enum(PROJECT_STATUS) });
const progressSchema = z.object({ progress: z.number().int().min(0).max(100) });

const createProjectSchema = z.object({
  customerId: z.string(),
  name: z.string().min(2),
  serviceId: z.string().optional(),
  description: z.string().optional(),
  valueCents: z.number().int().nonnegative().optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
});

export async function projectsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/projects", async () => (await (db.select().from(schema.projects))));

  app.post("/projects", async (request, reply) => {
    const body = createProjectSchema.parse(request.body);
    const project = await createProject({ ...body, responsibleUserId: request.user.sub });
    return reply.status(201).send(project);
  });

  app.get("/projects/:id", async (request) => {
    const { id } = request.params as { id: string };
    const project = (await (db.select().from(schema.projects).where(eq(schema.projects.id, id))))[0];
    if (!project) throw new NotFoundError("Projeto");
    const stages = (await (db.select().from(schema.projectStages).where(eq(schema.projectStages.projectId, id))));
    const tasks = (await (db.select().from(schema.tasks).where(eq(schema.tasks.projectId, id))));
    return { ...project, stages, tasks };
  });

  app.patch("/projects/:id/status", async (request) => {
    const { id } = request.params as { id: string };
    const { status } = statusSchema.parse(request.body);
    const project = (await (db.update(schema.projects).set({ status }).where(eq(schema.projects.id, id)).returning()))[0];
    if (!project) throw new NotFoundError("Projeto");
    emitEvent(SOCKET_EVENTS.PROJECT_UPDATED, { project });
    return project;
  });

  app.patch("/projects/:id/progress", async (request) => {
    const { id } = request.params as { id: string };
    const { progress } = progressSchema.parse(request.body);
    const project = (await (db.update(schema.projects).set({ progress }).where(eq(schema.projects.id, id)).returning()))[0];
    if (!project) throw new NotFoundError("Projeto");
    emitEvent(SOCKET_EVENTS.PROJECT_UPDATED, { project });
    return project;
  });

  app.patch("/projects/stages/:stageId/complete", async (request) => {
    const { stageId } = request.params as { stageId: string };
    const stage = (await (db.update(schema.projectStages).set({ completedAt: new Date() }).where(eq(schema.projectStages.id, stageId)).returning()))[0];
    if (!stage) throw new NotFoundError("Etapa do projeto");
    return stage;
  });
}
