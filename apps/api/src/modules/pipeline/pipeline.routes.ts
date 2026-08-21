import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { PIPELINE_STAGE } from "@nexodesk/shared";
import { getPipelineBoard, moveOpportunity } from "./pipeline.service.js";

const moveSchema = z.object({
  toStage: z.enum(PIPELINE_STAGE),
  order: z.number().int().default(0),
});

export async function pipelineRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/pipeline", async () => getPipelineBoard());

  app.patch("/pipeline/opportunities/:id/move", async (request) => {
    const { id } = request.params as { id: string };
    const { toStage, order } = moveSchema.parse(request.body);
    return moveOpportunity(id, toStage, request.user.sub, order);
  });
}
