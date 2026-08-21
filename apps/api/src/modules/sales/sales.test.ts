import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { schema } from "@nexodesk/database";
import { db } from "../../shared/database";
import { findOrCreateContact } from "../contacts/contacts.service";
import { createLeadForContact } from "../leads/leads.service";
import { closeSale } from "./sales.service";

function makeService() {
  return db
    .insert(schema.services)
    .values({ name: "Landing Page Teste", category: "Web", basePriceCents: 150000, minPriceCents: 90000 })
    .returning()
    .get();
}

describe("closeSale", () => {
  it("fans out into customer, sale, project (with stages) and receivable installments in one transaction", () => {
    const contact = findOrCreateContact({ phone: "+5551966660001", firstMessageAt: new Date() }).contact;
    const lead = createLeadForContact({ contactId: contact.id });
    const service = makeService();
    db.insert(schema.serviceStageTemplates).values([
      { serviceId: service.id, name: "Briefing", order: 0 },
      { serviceId: service.id, name: "Desenvolvimento", order: 1 },
    ]).run();

    const result = closeSale({
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

    const stages = db.select().from(schema.projectStages).where(eq(schema.projectStages.projectId, result.project.id)).all();
    expect(stages).toHaveLength(2);

    const receivables = db.select().from(schema.accountsReceivable).where(eq(schema.accountsReceivable.saleId, result.sale.id)).all();
    const total = receivables.reduce((sum, r) => sum + r.amountCents, 0);
    expect(total).toBe(150000);

    const updatedLead = db.select().from(schema.leads).where(eq(schema.leads.id, lead.id)).get();
    expect(updatedLead?.status).toBe("ganho");
  });

  it("preserves the lead after conversion instead of deleting it (spec §17)", () => {
    const contact = findOrCreateContact({ phone: "+5551966660002", firstMessageAt: new Date() }).contact;
    const lead = createLeadForContact({ contactId: contact.id });
    const service = makeService();

    closeSale({
      leadId: lead.id,
      serviceId: service.id,
      totalCents: 100000,
      downPaymentCents: 0,
      installmentCount: 2,
      paymentMethod: "PIX",
      deliveryDays: 5,
      responsibleUserId: "tester",
    });

    const stillExists = db.select().from(schema.leads).where(eq(schema.leads.id, lead.id)).get();
    expect(stillExists).toBeDefined();
  });

  it("does not create a second customer when the same lead is closed again for a different sale", () => {
    const contact = findOrCreateContact({ phone: "+5551966660003", firstMessageAt: new Date() }).contact;
    const lead = createLeadForContact({ contactId: contact.id });
    const service = makeService();

    const first = closeSale({ leadId: lead.id, serviceId: service.id, totalCents: 50000, downPaymentCents: 0, installmentCount: 1, paymentMethod: "PIX", deliveryDays: 5, responsibleUserId: "t" });
    const second = closeSale({ leadId: lead.id, serviceId: service.id, totalCents: 30000, downPaymentCents: 0, installmentCount: 1, paymentMethod: "PIX", deliveryDays: 5, responsibleUserId: "t" });

    expect(second.customer.id).toBe(first.customer.id);
  });
});
