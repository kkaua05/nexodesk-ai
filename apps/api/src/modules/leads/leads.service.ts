import { eq, desc } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, type LeadStatus } from "@nexodesk/shared";
import { SCORE_RULES, clampScore, type ScoreRuleKey } from "./lead-score.js";
import { emitEvent } from "../../shared/realtime.js";
import { SOCKET_EVENTS } from "@nexodesk/shared";

export async function createLeadForContact(params: { contactId: string; firstMessage?: string }) {
  const lead = (await (db
      .insert(schema.leads)
      .values({
        contactId: params.contactId,
        origin: "whatsapp",
        status: "novo",
        firstMessage: params.firstMessage,
      })
      .returning()))[0]!;

  (await (db.insert(schema.opportunities).values({ leadId: lead.id, stageKey: "novo_lead" })));

  emitEvent(SOCKET_EVENTS.LEAD_CREATED, { leadId: lead.id, contactId: params.contactId });
  return lead;
}

export async function findActiveLeadByContact(contactId: string) {
  return (await (db
      .select()
      .from(schema.leads)
      .where(eq(schema.leads.contactId, contactId))
      .orderBy(desc(schema.leads.createdAt))))[0];
}

export async function applyScoreEvent(leadId: string, ruleKey: ScoreRuleKey, description?: string) {
  const lead = (await (db.select().from(schema.leads).where(eq(schema.leads.id, leadId))))[0];
  if (!lead) throw new NotFoundError("Lead");

  const delta = SCORE_RULES[ruleKey];
  const newScore = clampScore(lead.score + delta);

  (await (db.insert(schema.leadEvents).values({ leadId, type: ruleKey, scoreDelta: delta, description })));
  const updated = (await (db.update(schema.leads).set({ score: newScore }).where(eq(schema.leads.id, leadId)).returning()))[0];

  emitEvent(SOCKET_EVENTS.LEAD_UPDATED, { leadId, score: newScore });
  return updated;
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const updated = (await (db.update(schema.leads).set({ status }).where(eq(schema.leads.id, leadId)).returning()))[0];
  if (!updated) throw new NotFoundError("Lead");
  emitEvent(SOCKET_EVENTS.LEAD_UPDATED, { leadId, status });
  return updated;
}

export async function listLeads() {
  return (await (db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt))));
}

export async function getLeadById(id: string) {
  const lead = (await (db.select().from(schema.leads).where(eq(schema.leads.id, id))))[0];
  if (!lead) throw new NotFoundError("Lead");
  return lead;
}
