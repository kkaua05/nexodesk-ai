import { eq, asc } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, SOCKET_EVENTS, type PipelineStage } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";

export function getPipelineBoard() {
  const stages = db.select().from(schema.pipelineStages).orderBy(asc(schema.pipelineStages.order)).all();
  const opportunities = db.select().from(schema.opportunities).orderBy(asc(schema.opportunities.order)).all();

  return stages.map((stage) => ({
    stage,
    opportunities: opportunities
      .filter((o) => o.stageKey === stage.key)
      .map((o) => {
        const lead = db.select().from(schema.leads).where(eq(schema.leads.id, o.leadId)).get();
        const contact = lead ? db.select().from(schema.contacts).where(eq(schema.contacts.id, lead.contactId)).get() : undefined;
        const service = lead?.serviceId ? db.select().from(schema.services).where(eq(schema.services.id, lead.serviceId)).get() : undefined;
        return { opportunity: o, lead, contact, service };
      }),
  }));
}

/**
 * Moving a card always writes through — DB update, history, and a realtime event.
 * Never a visual-only drag (spec §15).
 */
export function moveOpportunity(opportunityId: string, toStage: PipelineStage, movedByUserId: string, order: number) {
  const opportunity = db.select().from(schema.opportunities).where(eq(schema.opportunities.id, opportunityId)).get();
  if (!opportunity) throw new NotFoundError("Oportunidade");

  const fromStage = opportunity.stageKey as PipelineStage;

  const updated = db
    .update(schema.opportunities)
    .set({ stageKey: toStage, order })
    .where(eq(schema.opportunities.id, opportunityId))
    .returning()
    .get();

  db.insert(schema.opportunityHistory).values({ opportunityId, fromStage, toStage, movedByUserId }).run();

  db.update(schema.leads)
    .set({ status: mapStageToLeadStatus(toStage) })
    .where(eq(schema.leads.id, opportunity.leadId))
    .run();

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
