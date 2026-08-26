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
export async function createReceivable(input: CreateReceivableInput) {
  const customer = (await (db.select().from(schema.customers).where(eq(schema.customers.id, input.customerId))))[0];
  if (!customer) throw new NotFoundError("Cliente");

  if (input.projectId) {
    const project = (await (db.select().from(schema.projects).where(eq(schema.projects.id, input.projectId))))[0];
    if (!project) throw new NotFoundError("Projeto");
    if (project.customerId !== input.customerId) {
      throw new ValidationError("O projeto selecionado não pertence a este cliente");
    }
  }

  if (input.categoryId) {
    const category = (await (db.select().from(schema.financialCategories).where(eq(schema.financialCategories.id, input.categoryId))))[0];
    if (!category) throw new NotFoundError("Categoria financeira");
  }

  const receivable = (await (db
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
      .returning()))[0];

  await addTimelineEvent({ customerId: input.customerId, type: "receivable_created", title: `Cobrança criada: ${input.description}`, valueCents: input.amountCents });
  emitEvent(SOCKET_EVENTS.RECEIVABLE_UPDATED, { receivable });

  return receivable;
}

export async function registerReceivablePayment(receivableId: string, amountCents: number, method?: string) {
  const receivable = (await (db.select().from(schema.accountsReceivable).where(eq(schema.accountsReceivable.id, receivableId))))[0];
  if (!receivable) throw new NotFoundError("Conta a receber");

  (await (db.insert(schema.payments).values({ receivableId, amountCents, method, paidAt: new Date() })));

  const paidAmountCents = receivable.paidAmountCents + amountCents;
  const status = paidAmountCents >= receivable.amountCents ? "pago" : "parcial";

  const updated = (await (db
      .update(schema.accountsReceivable)
      .set({ paidAmountCents, status, paidAt: status === "pago" ? new Date() : receivable.paidAt, paymentMethod: method ?? receivable.paymentMethod })
      .where(eq(schema.accountsReceivable.id, receivableId))
      .returning()))[0]!;

  emitEvent(SOCKET_EVENTS.PAYMENT_CREATED, { receivable: updated });
  emitEvent(SOCKET_EVENTS.RECEIVABLE_UPDATED, { receivable: updated });

  if (updated.customerId) {
    (await (db.insert(schema.timelineEvents)
            .values({ customerId: updated.customerId, type: "payment_received", title: "Pagamento recebido", valueCents: amountCents, occurredAt: new Date() })));
  }

  return updated;
}

export async function registerPayablePayment(payableId: string) {
  const updated = (await (db.update(schema.accountsPayable).set({ status: "pago", paidAt: new Date() }).where(eq(schema.accountsPayable.id, payableId)).returning()))[0];
  if (!updated) throw new NotFoundError("Conta a pagar");
  (await (db.insert(schema.payments).values({ payableId, amountCents: updated.amountCents, paidAt: new Date() })));
  return updated;
}

export async function getFinancialOverview() {
  const receivables = (await (db.select().from(schema.accountsReceivable)));
  const payables = (await (db.select().from(schema.accountsPayable)));

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
export async function markOverdueReceivables() {
  const now = Date.now();
  const overdue = (await (db
      .select()
      .from(schema.accountsReceivable)))
    .filter((r) => (r.status === "pendente" || r.status === "parcial") && r.dueDate.getTime() < now);

  for (const receivable of overdue) {
    (await (db.update(schema.accountsReceivable).set({ status: "vencido" }).where(eq(schema.accountsReceivable.id, receivable.id))));
    emitEvent(SOCKET_EVENTS.PAYMENT_OVERDUE, { receivable });
  }
  return overdue.length;
}
