import { describe, expect, it } from "vitest";
import { schema } from "@nexodesk/database";
import { db } from "../../shared/database";
import { findOrCreateContact } from "../contacts/contacts.service";
import { registerReceivablePayment, markOverdueReceivables } from "./finance.service";

function makeCustomer(phone: string) {
  const contact = findOrCreateContact({ phone, firstMessageAt: new Date() }).contact;
  return db.insert(schema.customers).values({ contactId: contact.id, name: "Cliente Teste", customerSince: new Date() }).returning().get();
}

describe("registerReceivablePayment", () => {
  it("marks a receivable as 'pago' once the full amount is paid", () => {
    const customer = makeCustomer("+5551944440001");
    const receivable = db
      .insert(schema.accountsReceivable)
      .values({ customerId: customer.id, description: "Teste", amountCents: 10000, dueDate: new Date() })
      .returning()
      .get();

    const updated = registerReceivablePayment(receivable.id, 10000);
    expect(updated.status).toBe("pago");
    expect(updated.paidAmountCents).toBe(10000);
  });

  it("marks a receivable as 'parcial' when only part of the amount is paid", () => {
    const customer = makeCustomer("+5551944440002");
    const receivable = db
      .insert(schema.accountsReceivable)
      .values({ customerId: customer.id, description: "Teste parcial", amountCents: 10000, dueDate: new Date() })
      .returning()
      .get();

    const updated = registerReceivablePayment(receivable.id, 4000);
    expect(updated.status).toBe("parcial");
    expect(updated.paidAmountCents).toBe(4000);
  });
});

describe("markOverdueReceivables", () => {
  it("flips pending receivables past their due date to 'vencido', and leaves future ones untouched", () => {
    const customer = makeCustomer("+5551944440003");
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const overdue = db.insert(schema.accountsReceivable).values({ customerId: customer.id, description: "Vencida", amountCents: 5000, dueDate: past }).returning().get();
    const upcoming = db.insert(schema.accountsReceivable).values({ customerId: customer.id, description: "Futura", amountCents: 5000, dueDate: future }).returning().get();

    markOverdueReceivables();

    const overdueAfter = db.select().from(schema.accountsReceivable).all().find((r) => r.id === overdue.id);
    const upcomingAfter = db.select().from(schema.accountsReceivable).all().find((r) => r.id === upcoming.id);

    expect(overdueAfter?.status).toBe("vencido");
    expect(upcomingAfter?.status).toBe("pendente");
  });
});
