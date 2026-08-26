import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { PROPOSAL_STATUS } from "@nexodesk/shared";
import { createProposal, listProposals, getProposalWithItems, updateProposalStatus } from "./proposals.service.js";

const itemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPriceCents: z.number().int().nonnegative(),
});

const createSchema = z.object({
  leadId: z.string().optional(),
  customerId: z.string().optional(),
  serviceId: z.string().optional(),
  description: z.string().optional(),
  items: z.array(itemSchema).min(1),
  discountCents: z.number().int().nonnegative().optional(),
  downPaymentCents: z.number().int().nonnegative().optional(),
  installmentCount: z.number().int().positive().optional(),
  deliveryDays: z.number().int().positive().optional(),
  conditions: z.string().optional(),
  notes: z.string().optional(),
  validUntil: z.coerce.date().optional(),
});

const statusSchema = z.object({ status: z.enum(PROPOSAL_STATUS) });

export async function proposalsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/proposals", async () => listProposals());

  app.get("/proposals/:id", async (request) => {
    const { id } = request.params as { id: string };
    return getProposalWithItems(id);
  });

  app.post("/proposals", async (request, reply) => {
    const body = createSchema.parse(request.body);
    const proposal = await createProposal(body);
    return reply.status(201).send(proposal);
  });

  app.patch("/proposals/:id/status", async (request) => {
    const { id } = request.params as { id: string };
    const { status } = statusSchema.parse(request.body);
    return updateProposalStatus(id, status);
  });
}
