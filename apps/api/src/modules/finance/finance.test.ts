import { describe, expect, it } from "vitest";
import { schema } from "@nexodesk/database";
import { db } from "../../shared/database";
import { findOrCreateContact } from "../contacts/contacts.service";
import { registerReceivablePayment, markOverdueReceivables } from "./finance.service";

async function makeCustomer(phone: string) {
  const contact = (await findOrCreateContact({ phone, firstMessageAt: new Date() })).contact!;
  return (await db.insert(schema.customers).values({ contactId: contact.id, name: "Cliente Teste", customerSince: new Date() }).returning())[0]!;
}

describe("registerReceivablePayment", () => {
  it("marks a receivable as 'pago' once the full amount is paid", async () => {
    const customer = await makeCustomer("+5551944440001");
    const receivable = (await db
      .insert(schema.accountsReceivable)
      .values({ customerId: customer.id, description: "Teste", amountCents: 10000, dueDate: new Date() })
      .returning())[0]!;

    const updated = await registerReceivablePayment(receivable.id, 10000);
    expect(updated.status).toBe("pago");
    expect(updated.paidAmountCents).toBe(10000);
  });

  it("marks a receivable as 'parcial' when only part of the amount is paid", async () => {
    const customer = await makeCustomer("+5551944440002");
    const receivable = (await db
      .insert(schema.accountsReceivable)
      .values({ customerId: customer.id, description: "Teste parcial", amountCents: 10000, dueDate: new Date() })
      .returning())[0]!;

    const updated = await registerReceivablePayment(receivable.id, 4000);
    expect(updated.status).toBe("parcial");
    expect(updated.paidAmountCents).toBe(4000);
  });
});

describe("markOverdueReceivables", () => {
  it("flips pending receivables past their due date to 'vencido', and leaves future ones untouched", async () => {
    const customer = await makeCustomer("+5551944440003");
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const overdue = (await db.insert(schema.accountsReceivable).values({ customerId: customer.id, description: "Vencida", amountCents: 5000, dueDate: past }).returning())[0]!;
    const upcoming = (await db.insert(schema.accountsReceivable).values({ customerId: customer.id, description: "Futura", amountCents: 5000, dueDate: future }).returning())[0]!;

    await markOverdueReceivables();

    const overdueAfter = (await db.select().from(schema.accountsReceivable)).find((r) => r.id === overdue.id);
    const upcomingAfter = (await db.select().from(schema.accountsReceivable)).find((r) => r.id === upcoming.id);

    expect(overdueAfter?.status).toBe("vencido");
    expect(upcomingAfter?.status).toBe("pendente");
  });
});
