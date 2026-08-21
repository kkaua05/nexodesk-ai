import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { getAgenda } from "./calendar.service.js";

const querySchema = z.object({ from: z.coerce.date(), to: z.coerce.date() });

const createEventSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(schema.CALENDAR_EVENT_TYPE),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  responsibleUserId: z.string().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
});

export async function calendarRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/calendar", async (request) => {
    const { from, to } = querySchema.parse(request.query);
    return getAgenda(from, to);
  });

  app.post("/calendar/events", async (request, reply) => {
    const body = createEventSchema.parse(request.body);
    const event = db.insert(schema.calendarEvents).values(body).returning().get();
    return reply.status(201).send(event);
  });
}
