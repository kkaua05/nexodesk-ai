import { eq, desc } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, type LeadStatus } from "@nexodesk/shared";
import { SCORE_RULES, clampScore, type ScoreRuleKey } from "./lead-score.js";
import { emitEvent } from "../../shared/realtime.js";
import { SOCKET_EVENTS } from "@nexodesk/shared";

export function createLeadForContact(params: { contactId: string; firstMessage?: string }) {
  const lead = db
    .insert(schema.leads)
    .values({
      contactId: params.contactId,
      origin: "whatsapp",
      status: "novo",
      firstMessage: params.firstMessage,
    })
    .returning()
    .get();

  db.insert(schema.opportunities).values({ leadId: lead.id, stageKey: "novo_lead" }).run();

  emitEvent(SOCKET_EVENTS.LEAD_CREATED, { leadId: lead.id, contactId: params.contactId });
  return lead;
}

export function findActiveLeadByContact(contactId: string) {
  return db
    .select()
    .from(schema.leads)
    .where(eq(schema.leads.contactId, contactId))
    .orderBy(desc(schema.leads.createdAt))
    .get();
}

export function applyScoreEvent(leadId: string, ruleKey: ScoreRuleKey, description?: string) {
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, leadId)).get();
  if (!lead) throw new NotFoundError("Lead");

  const delta = SCORE_RULES[ruleKey];
  const newScore = clampScore(lead.score + delta);

  db.insert(schema.leadEvents).values({ leadId, type: ruleKey, scoreDelta: delta, description }).run();
  const updated = db.update(schema.leads).set({ score: newScore }).where(eq(schema.leads.id, leadId)).returning().get();

  emitEvent(SOCKET_EVENTS.LEAD_UPDATED, { leadId, score: newScore });
  return updated;
}

export function updateLeadStatus(leadId: string, status: LeadStatus) {
  const updated = db.update(schema.leads).set({ status }).where(eq(schema.leads.id, leadId)).returning().get();
  if (!updated) throw new NotFoundError("Lead");
  emitEvent(SOCKET_EVENTS.LEAD_UPDATED, { leadId, status });
  return updated;
}

export function listLeads() {
  return db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt)).all();
}

export function getLeadById(id: string) {
  const lead = db.select().from(schema.leads).where(eq(schema.leads.id, id)).get();
  if (!lead) throw new NotFoundError("Lead");
  return lead;
}
