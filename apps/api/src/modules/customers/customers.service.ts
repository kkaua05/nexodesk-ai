import { eq, desc } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, ConflictError } from "@nexodesk/shared";
import { findOrCreateContact } from "../contacts/contacts.service.js";

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  document?: string;
  address?: string;
  notes?: string;
}

/**
 * Manual "novo cliente" entry point — customers are otherwise only ever created
 * automatically when a sale closes (see sales.service.ts's closeSale). Reuses the same
 * phone-dedup contact lookup as the WhatsApp flow so a manually added customer and one
 * that later writes in on WhatsApp resolve to the same contact instead of splitting.
 */
export function createCustomer(input: CreateCustomerInput) {
  const { contact } = findOrCreateContact({ name: input.name, phone: input.phone, firstMessageAt: new Date() });

  const existing = db.select().from(schema.customers).where(eq(schema.customers.contactId, contact.id)).get();
  if (existing) {
    throw new ConflictError("CUSTOMER_ALREADY_EXISTS", `Já existe um cliente cadastrado com esse telefone: ${existing.name}`);
  }

  const customer = db
    .insert(schema.customers)
    .values({
      contactId: contact.id,
      name: input.name,
      email: input.email,
      company: input.company,
      document: input.document,
      address: input.address,
      notes: input.notes,
      customerSince: new Date(),
    })
    .returning()
    .get();

  addTimelineEvent({ customerId: customer.id, type: "customer_created", title: "Cliente cadastrado manualmente" });

  return customer;
}

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
