import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, SOCKET_EVENTS } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";

const INACTIVITY_THRESHOLD_DAYS = 3;

export async function listOpenFollowUps() {
  return (await (db.select().from(schema.followUps))).filter((f) => !f.resolvedAt);
}

export async function resolveFollowUp(id: string) {
  const updated = (await (db.update(schema.followUps).set({ resolvedAt: new Date() }).where(eq(schema.followUps.id, id)).returning()))[0];
  if (!updated) throw new NotFoundError("Follow-up");
  return updated;
}

/**
 * Detects leads that went quiet (spec §33/§44): no contact update in
 * INACTIVITY_THRESHOLD_DAYS. Driven by the "lead_inactivity_followup" automation.
 */
export async function detectInactiveLeads() {
  const cutoff = Date.now() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const openLeads = (await (db.select().from(schema.leads))).filter((l) => l.status !== "ganho" && l.status !== "perdido");

  let created = 0;
  for (const lead of openLeads) {
    const contact = (await (db.select().from(schema.contacts).where(eq(schema.contacts.id, lead.contactId))))[0];
    if (!contact || contact.lastContactAt.getTime() > cutoff) continue;

    const existingOpen = (await (db
          .select()
          .from(schema.followUps)))
      .find((f) => f.leadId === lead.id && !f.resolvedAt && f.reason === "lead_sem_resposta");
    if (existingOpen) continue;

    const followUp = (await (db
          .insert(schema.followUps)
          .values({ reason: "lead_sem_resposta", leadId: lead.id, note: `Sem interação há mais de ${INACTIVITY_THRESHOLD_DAYS} dias`, dueAt: new Date() })
          .returning()))[0];

    emitEvent(SOCKET_EVENTS.FOLLOWUP_CREATED, { followUp });
    created += 1;
  }
  return created;
}

export async function detectStalledProposals() {
  const proposals = (await (db.select().from(schema.proposals))).filter((p) => p.status === "enviada" || p.status === "visualizada");
  let created = 0;

  for (const proposal of proposals) {
    if (!proposal.sentAt) continue;
    const daysSinceSent = (Date.now() - proposal.sentAt.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceSent < INACTIVITY_THRESHOLD_DAYS) continue;

    const existingOpen = (await (db
          .select()
          .from(schema.followUps)))
      .find((f) => f.proposalId === proposal.id && !f.resolvedAt);
    if (existingOpen) continue;

    const followUp = (await (db
          .insert(schema.followUps)
          .values({ reason: "proposta_sem_retorno", proposalId: proposal.id, leadId: proposal.leadId, note: `Sem retorno há ${Math.floor(daysSinceSent)} dias`, dueAt: new Date() })
          .returning()))[0];

    emitEvent(SOCKET_EVENTS.FOLLOWUP_CREATED, { followUp });
    created += 1;
  }
  return created;
}
