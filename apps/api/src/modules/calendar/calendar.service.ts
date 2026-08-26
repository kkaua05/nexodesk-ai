import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";

export interface AgendaEntry {
  id: string;
  title: string;
  type: string;
  startAt: Date;
  endAt?: Date | null;
  customerId?: string | null;
  projectId?: string | null;
  valueCents?: number;
  source: "calendar" | "receivable" | "payable";
}

/**
 * Merges real calendar events with a computed projection of financial due dates
 * (spec §32) — payments never get written twice into `calendar_events`; they're
 * derived on read.
 */
export async function getAgenda(from: Date, to: Date): Promise<AgendaEntry[]> {
  const events = (await (db.select().from(schema.calendarEvents))).filter((e) => e.startAt >= from && e.startAt <= to);

  const receivables = (await (db
      .select()
      .from(schema.accountsReceivable)))
    .filter((r) => r.status !== "pago" && r.status !== "cancelado" && r.dueDate >= from && r.dueDate <= to);

  const payables = (await (db
      .select()
      .from(schema.accountsPayable)))
    .filter((p) => p.status !== "pago" && p.status !== "cancelado" && p.dueDate >= from && p.dueDate <= to);

  const entries: AgendaEntry[] = [
    ...events.map((e) => ({ id: e.id, title: e.title, type: e.type, startAt: e.startAt, endAt: e.endAt, customerId: e.customerId, projectId: e.projectId, source: "calendar" as const })),
    ...receivables.map((r) => ({
      id: r.id,
      title: `Pagamento — ${r.description}`,
      type: "pagamento",
      startAt: r.dueDate,
      customerId: r.customerId,
      projectId: r.projectId,
      valueCents: r.amountCents - r.paidAmountCents,
      source: "receivable" as const,
    })),
    ...payables.map((p) => ({
      id: p.id,
      title: `Vencimento — ${p.description}`,
      type: "vencimento",
      startAt: p.dueDate,
      valueCents: p.amountCents,
      source: "payable" as const,
    })),
  ];

  return entries.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}
