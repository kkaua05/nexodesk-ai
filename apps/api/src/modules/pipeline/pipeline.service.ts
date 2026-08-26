import { eq, asc } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, SOCKET_EVENTS, type PipelineStage } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";

export async function getPipelineBoard() {
  const stages = (await (db.select().from(schema.pipelineStages).orderBy(asc(schema.pipelineStages.order))));
  const opportunities = (await (db.select().from(schema.opportunities).orderBy(asc(schema.opportunities.order))));

  return Promise.all(
    stages.map(async (stage) => ({
      stage,
      opportunities: await Promise.all(
        opportunities
          .filter((o) => o.stageKey === stage.key)
          .map(async (o) => {
            const lead = (await (db.select().from(schema.leads).where(eq(schema.leads.id, o.leadId))))[0];
            const contact = lead ? (await (db.select().from(schema.contacts).where(eq(schema.contacts.id, lead.contactId))))[0] : undefined;
            const service = lead?.serviceId ? (await (db.select().from(schema.services).where(eq(schema.services.id, lead.serviceId))))[0] : undefined;
            return { opportunity: o, lead, contact, service };
          }),
      ),
    })),
  );
}

/**
 * Moving a card always writes through — DB update, history, and a realtime event.
 * Never a visual-only drag (spec §15).
 */
export async function moveOpportunity(opportunityId: string, toStage: PipelineStage, movedByUserId: string, order: number) {
  const opportunity = (await (db.select().from(schema.opportunities).where(eq(schema.opportunities.id, opportunityId))))[0];
  if (!opportunity) throw new NotFoundError("Oportunidade");

  const fromStage = opportunity.stageKey as PipelineStage;

  const updated = (await (db
      .update(schema.opportunities)
      .set({ stageKey: toStage, order })
      .where(eq(schema.opportunities.id, opportunityId))
      .returning()))[0];

  (await (db.insert(schema.opportunityHistory).values({ opportunityId, fromStage, toStage, movedByUserId })));

  (await (db.update(schema.leads)
        .set({ status: mapStageToLeadStatus(toStage) })
        .where(eq(schema.leads.id, opportunity.leadId))));

  emitEvent(SOCKET_EVENTS.OPPORTUNITY_MOVED, { opportunityId, fromStage, toStage });
  return updated;
}

function mapStageToLeadStatus(stage: PipelineStage) {
  const map = {
    novo_lead: "novo",
    contato: "contato",
    qualificacao: "qualificacao",
    orcamento: "orcamento",
    proposta: "proposta",
    negociacao: "negociacao",
    fechado: "ganho",
    perdido: "perdido",
  } as const;
  return map[stage];
}
