import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, SOCKET_EVENTS, sumCents } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";

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
