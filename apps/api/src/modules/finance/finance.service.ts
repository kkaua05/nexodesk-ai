import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, ValidationError, SOCKET_EVENTS, sumCents } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";
import { addTimelineEvent } from "../customers/customers.service.js";

export interface CreateReceivableInput {
  customerId: string;
  projectId?: string;
  categoryId?: string;
  description: string;
  amountCents: number;
  dueDate: Date;
}

/**
 * Manual "nova cobrança" entry point — receivables are otherwise only ever created
 * automatically as sale installments inside sales.service.ts's closeSale(). Lets a
 * customer's revenue be tracked accurately even when it didn't come from the sales
 * pipeline (e.g. a project value entered after the fact, an extra charge).
 */
export function createReceivable(input: CreateReceivableInput) {
  const customer = db.select().from(schema.customers).where(eq(schema.customers.id, input.customerId)).get();
  if (!customer) throw new NotFoundError("Cliente");

  if (input.projectId) {
    const project = db.select().from(schema.projects).where(eq(schema.projects.id, input.projectId)).get();
    if (!project) throw new NotFoundError("Projeto");
    if (project.customerId !== input.customerId) {
      throw new ValidationError("O projeto selecionado não pertence a este cliente");
    }
  }

  if (input.categoryId) {
    const category = db.select().from(schema.financialCategories).where(eq(schema.financialCategories.id, input.categoryId)).get();
    if (!category) throw new NotFoundError("Categoria financeira");
  }

  const receivable = db
    .insert(schema.accountsReceivable)
    .values({
      customerId: input.customerId,
      projectId: input.projectId,
      categoryId: input.categoryId,
      description: input.description,
      amountCents: input.amountCents,
      dueDate: input.dueDate,
      status: "pendente",
    })
    .returning()
    .get();

  addTimelineEvent({ customerId: input.customerId, type: "receivable_created", title: `Cobrança criada: ${input.description}`, valueCents: input.amountCents });
  emitEvent(SOCKET_EVENTS.RECEIVABLE_UPDATED, { receivable });

  return receivable;
}

export function registerReceivablePayment(receivableId: string, amountCents: number, method?: string) {
  const receivable = db.select().from(schema.accountsReceivable).where(eq(schema.accountsReceivable.id, receivableId)).get();
  if (!receivable) throw new NotFoundError("Conta a receber");

  db.insert(schema.payments).values({ receivableId, amountCents, method, paidAt: new Date() }).run();

  const paidAmountCents = receivable.paidAmountCents + amountCents;
  const status = paidAmountCents >= receivable.amountCents ? "pago" : "parcial";

  const updated = db
    .update(schema.accountsReceivable)
    .set({ paidAmountCents, status, paidAt: status === "pago" ? new Date() : receivable.paidAt, paymentMethod: method ?? receivable.paymentMethod })
    .where(eq(schema.accountsReceivable.id, receivableId))
    .returning()
    .get();

  emitEvent(SOCKET_EVENTS.PAYMENT_CREATED, { receivable: updated });
  emitEvent(SOCKET_EVENTS.RECEIVABLE_UPDATED, { receivable: updated });

  if (updated.customerId) {
    db.insert(schema.timelineEvents)
      .values({ customerId: updated.customerId, type: "payment_received", title: "Pagamento recebido", valueCents: amountCents, occurredAt: new Date() })
      .run();
  }

  return updated;
}

export function registerPayablePayment(payableId: string) {
  const updated = db.update(schema.accountsPayable).set({ status: "pago", paidAt: new Date() }).where(eq(schema.accountsPayable.id, payableId)).returning().get();
  if (!updated) throw new NotFoundError("Conta a pagar");
  db.insert(schema.payments).values({ payableId, amountCents: updated.amountCents, paidAt: new Date() }).run();
  return updated;
}

export function getFinancialOverview() {
  const receivables = db.select().from(schema.accountsReceivable).all();
  const payables = db.select().from(schema.accountsPayable).all();

  const now = Date.now();
  const faturamentoCents = sumCents(...receivables.map((r) => r.amountCents));
  const recebidoCents = sumCents(...receivables.map((r) => r.paidAmountCents));
  const aReceberCents = faturamentoCents - recebidoCents;
  const vencidoCents = sumCents(
    ...receivables.filter((r) => r.status !== "pago" && r.dueDate.getTime() < now).map((r) => r.amountCents - r.paidAmountCents),
  );
  const despesasCents = sumCents(...payables.map((p) => p.amountCents));

  return { faturamentoCents, recebidoCents, aReceberCents, vencidoCents, despesasCents, lucroCents: recebidoCents - despesasCents };
}

/** Automations: payment_due_soon / payment_overdue (spec §44) — call periodically. */
export function markOverdueReceivables() {
  const now = Date.now();
  const overdue = db
    .select()
    .from(schema.accountsReceivable)
    .all()
    .filter((r) => (r.status === "pendente" || r.status === "parcial") && r.dueDate.getTime() < now);

  for (const receivable of overdue) {
    db.update(schema.accountsReceivable).set({ status: "vencido" }).where(eq(schema.accountsReceivable.id, receivable.id)).run();
    emitEvent(SOCKET_EVENTS.PAYMENT_OVERDUE, { receivable });
  }
  return overdue.length;
}
