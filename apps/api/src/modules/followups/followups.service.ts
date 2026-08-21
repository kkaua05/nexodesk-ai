import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, SOCKET_EVENTS } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";

const INACTIVITY_THRESHOLD_DAYS = 3;

export function listOpenFollowUps() {
  return db.select().from(schema.followUps).all().filter((f) => !f.resolvedAt);
}

export function resolveFollowUp(id: string) {
  const updated = db.update(schema.followUps).set({ resolvedAt: new Date() }).where(eq(schema.followUps.id, id)).returning().get();
  if (!updated) throw new NotFoundError("Follow-up");
  return updated;
}

/**
 * Detects leads that went quiet (spec §33/§44): no contact update in
 * INACTIVITY_THRESHOLD_DAYS. Driven by the "lead_inactivity_followup" automation.
 */
export function detectInactiveLeads() {
  const cutoff = Date.now() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const openLeads = db.select().from(schema.leads).all().filter((l) => l.status !== "ganho" && l.status !== "perdido");

  let created = 0;
  for (const lead of openLeads) {
    const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, lead.contactId)).get();
    if (!contact || contact.lastContactAt.getTime() > cutoff) continue;

    const existingOpen = db
      .select()
      .from(schema.followUps)
      .all()
      .find((f) => f.leadId === lead.id && !f.resolvedAt && f.reason === "lead_sem_resposta");
    if (existingOpen) continue;

    const followUp = db
      .insert(schema.followUps)
      .values({ reason: "lead_sem_resposta", leadId: lead.id, note: `Sem interação há mais de ${INACTIVITY_THRESHOLD_DAYS} dias`, dueAt: new Date() })
      .returning()
      .get();

    emitEvent(SOCKET_EVENTS.FOLLOWUP_CREATED, { followUp });
    created += 1;
  }
  return created;
}

export function detectStalledProposals() {
  const proposals = db.select().from(schema.proposals).all().filter((p) => p.status === "enviada" || p.status === "visualizada");
  let created = 0;

  for (const proposal of proposals) {
    if (!proposal.sentAt) continue;
    const daysSinceSent = (Date.now() - proposal.sentAt.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceSent < INACTIVITY_THRESHOLD_DAYS) continue;

    const existingOpen = db
      .select()
      .from(schema.followUps)
      .all()
      .find((f) => f.proposalId === proposal.id && !f.resolvedAt);
    if (existingOpen) continue;

    const followUp = db
      .insert(schema.followUps)
      .values({ reason: "proposta_sem_retorno", proposalId: proposal.id, leadId: proposal.leadId, note: `Sem retorno há ${Math.floor(daysSinceSent)} dias`, dueAt: new Date() })
      .returning()
      .get();

    emitEvent(SOCKET_EVENTS.FOLLOWUP_CREATED, { followUp });
    created += 1;
  }
  return created;
}
