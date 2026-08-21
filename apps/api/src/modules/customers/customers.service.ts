import { eq, desc } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError } from "@nexodesk/shared";

export function listCustomers() {
  return db.select().from(schema.customers).orderBy(desc(schema.customers.createdAt)).all();
}

export function getCustomerById(id: string) {
  const customer = db.select().from(schema.customers).where(eq(schema.customers.id, id)).get();
  if (!customer) throw new NotFoundError("Cliente");
  return customer;
}

export function getCustomerFinancialSummary(customerId: string) {
  const receivables = db.select().from(schema.accountsReceivable).where(eq(schema.accountsReceivable.customerId, customerId)).all();
  const totalContractedCents = receivables.reduce((sum, r) => sum + r.amountCents, 0);
  const receivedCents = receivables.reduce((sum, r) => sum + r.paidAmountCents, 0);
  const pendingCents = totalContractedCents - receivedCents;
  return { totalContractedCents, receivedCents, pendingCents };
}

export function getCustomerTimeline(customerId: string) {
  return db
    .select()
    .from(schema.timelineEvents)
    .where(eq(schema.timelineEvents.customerId, customerId))
    .orderBy(desc(schema.timelineEvents.occurredAt))
    .all();
}

export function addTimelineEvent(input: {
  customerId: string;
  leadId?: string;
  type: string;
  title: string;
  description?: string;
  valueCents?: number;
  occurredAt?: Date;
}) {
  return db
    .insert(schema.timelineEvents)
    .values({ ...input, occurredAt: input.occurredAt ?? new Date() })
    .returning()
    .get();
}
