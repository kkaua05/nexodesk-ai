import { eq, desc } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, SOCKET_EVENTS, sumCents, type ProposalStatus } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";
import { nextDocumentNumber } from "../../shared/document-number.js";

export interface ProposalItemInput {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface CreateProposalInput {
  leadId?: string;
  customerId?: string;
  serviceId?: string;
  description?: string;
  items: ProposalItemInput[];
  discountCents?: number;
  downPaymentCents?: number;
  installmentCount?: number;
  deliveryDays?: number;
  conditions?: string;
  notes?: string;
  validUntil?: Date;
}

export async function createProposal(input: CreateProposalInput) {
  const itemTotals = input.items.map((item) => ({ ...item, totalCents: item.quantity * item.unitPriceCents }));
  const subtotalCents = sumCents(...itemTotals.map((i) => i.totalCents));
  const discountCents = input.discountCents ?? 0;
  const totalCents = subtotalCents - discountCents;

  const proposal = (await (db
      .insert(schema.proposals)
      .values({
        number: await nextDocumentNumber("PROP"),
        leadId: input.leadId,
        customerId: input.customerId,
        serviceId: input.serviceId,
        description: input.description,
        subtotalCents,
        discountCents,
        totalCents,
        downPaymentCents: input.downPaymentCents,
        installmentCount: input.installmentCount ?? 1,
        deliveryDays: input.deliveryDays,
        conditions: input.conditions,
        notes: input.notes,
        validUntil: input.validUntil,
        status: "rascunho",
      })
      .returning()))[0]!;

  for (const [order, item] of itemTotals.entries()) {
    await db.insert(schema.proposalItems).values({ proposalId: proposal.id, description: item.description, quantity: item.quantity, unitPriceCents: item.unitPriceCents, totalCents: item.totalCents, order });
  }

  emitEvent(SOCKET_EVENTS.PROPOSAL_UPDATED, { proposal });
  return proposal;
}

export async function listProposals() {
  return (await (db.select().from(schema.proposals).orderBy(desc(schema.proposals.createdAt))));
}

export async function getProposalWithItems(id: string) {
  const proposal = (await (db.select().from(schema.proposals).where(eq(schema.proposals.id, id))))[0];
  if (!proposal) throw new NotFoundError("Proposta");
  const items = (await (db.select().from(schema.proposalItems).where(eq(schema.proposalItems.proposalId, id))));
  return { ...proposal, items };
}

const STATUS_TIMESTAMP_FIELD: Partial<Record<ProposalStatus, "sentAt" | "viewedAt" | "respondedAt">> = {
  enviada: "sentAt",
  visualizada: "viewedAt",
  aceita: "respondedAt",
  rejeitada: "respondedAt",
};

export async function updateProposalStatus(id: string, status: ProposalStatus) {
  const timestampField = STATUS_TIMESTAMP_FIELD[status];
  const updated = (await (db
      .update(schema.proposals)
      .set({ status, ...(timestampField ? { [timestampField]: new Date() } : {}) })
      .where(eq(schema.proposals.id, id))
      .returning()))[0];
  if (!updated) throw new NotFoundError("Proposta");
  emitEvent(SOCKET_EVENTS.PROPOSAL_UPDATED, { proposal: updated });
  return updated;
}
