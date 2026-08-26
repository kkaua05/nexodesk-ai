import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { schema } from "@nexodesk/database";
import { db } from "../../shared/database";
import { findOrCreateContact } from "../contacts/contacts.service";
import { createLeadForContact } from "../leads/leads.service";
import { closeSale } from "./sales.service";

async function makeService() {
  return (await db
    .insert(schema.services)
    .values({ name: "Landing Page Teste", category: "Web", basePriceCents: 150000, minPriceCents: 90000 })
    .returning())[0]!;
}

describe("closeSale", () => {
  it("fans out into customer, sale, project (with stages) and receivable installments in one transaction", async () => {
    const contact = (await findOrCreateContact({ phone: "+5551966660001", firstMessageAt: new Date() })).contact!;
    const lead = await createLeadForContact({ contactId: contact.id });
    const service = await makeService();
    await db.insert(schema.serviceStageTemplates).values([
      { serviceId: service.id, name: "Briefing", order: 0 },
      { serviceId: service.id, name: "Desenvolvimento", order: 1 },
    ]);

    const result = await closeSale({
      leadId: lead.id,
      serviceId: service.id,
      totalCents: 150000,
      downPaymentCents: 75000,
      installmentCount: 1,
      paymentMethod: "PIX",
      deliveryDays: 10,
      responsibleUserId: "tester",
    });

    expect(result.customer.contactId).toBe(contact.id);
    expect(result.sale.totalCents).toBe(150000);
    expect(result.project.customerId).toBe(result.customer.id);

    const stages = await db.select().from(schema.projectStages).where(eq(schema.projectStages.projectId, result.project.id));
    expect(stages).toHaveLength(2);

    const receivables = await db.select().from(schema.accountsReceivable).where(eq(schema.accountsReceivable.saleId, result.sale.id));
    const total = receivables.reduce((sum, r) => sum + r.amountCents, 0);
    expect(total).toBe(150000);

    const updatedLead = (await db.select().from(schema.leads).where(eq(schema.leads.id, lead.id)))[0];
    expect(updatedLead?.status).toBe("ganho");
  });

  it("preserves the lead after conversion instead of deleting it (spec §17)", async () => {
    const contact = (await findOrCreateContact({ phone: "+5551966660002", firstMessageAt: new Date() })).contact!;
    const lead = await createLeadForContact({ contactId: contact.id });
    const service = await makeService();

    await closeSale({
      leadId: lead.id,
      serviceId: service.id,
      totalCents: 100000,
      downPaymentCents: 0,
      installmentCount: 2,
      paymentMethod: "PIX",
      deliveryDays: 5,
      responsibleUserId: "tester",
    });

    const stillExists = (await db.select().from(schema.leads).where(eq(schema.leads.id, lead.id)))[0];
    expect(stillExists).toBeDefined();
  });

  it("does not create a second customer when the same lead is closed again for a different sale", async () => {
    const contact = (await findOrCreateContact({ phone: "+5551966660003", firstMessageAt: new Date() })).contact!;
    const lead = await createLeadForContact({ contactId: contact.id });
    const service = await makeService();

    const first = await closeSale({ leadId: lead.id, serviceId: service.id, totalCents: 50000, downPaymentCents: 0, installmentCount: 1, paymentMethod: "PIX", deliveryDays: 5, responsibleUserId: "t" });
    const second = await closeSale({ leadId: lead.id, serviceId: service.id, totalCents: 30000, downPaymentCents: 0, installmentCount: 1, paymentMethod: "PIX", deliveryDays: 5, responsibleUserId: "t" });

    expect(second.customer.id).toBe(first.customer.id);
  });
});
