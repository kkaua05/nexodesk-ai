import { describe, expect, it } from "vitest";
import { findOrCreateContact } from "../contacts/contacts.service";
import { createLeadForContact, applyScoreEvent, findActiveLeadByContact } from "./leads.service";

async function makeContact(phone: string) {
  return (await findOrCreateContact({ phone, firstMessageAt: new Date() })).contact!;
}

describe("leads.service", () => {
  it("creates a lead with status 'novo' and an opportunity in 'novo_lead'", async () => {
    const contact = await makeContact("+5551977770001");
    const lead = await createLeadForContact({ contactId: contact.id, firstMessage: "Quanto custa um site?" });

    expect(lead.status).toBe("novo");
    expect(lead.score).toBe(0);
    expect((await findActiveLeadByContact(contact.id))?.id).toBe(lead.id);
  });

  it("accumulates score deltas from the rule engine and clamps at 100", async () => {
    const contact = await makeContact("+5551977770002");
    const lead = await createLeadForContact({ contactId: contact.id });

    await applyScoreEvent(lead.id, "solicitou_orcamento"); // +20
    await applyScoreEvent(lead.id, "informou_orcamento"); // +15
    const afterTwo = await applyScoreEvent(lead.id, "solicitou_proposta"); // +20 = 55
    expect(afterTwo!.score).toBe(55);

    await applyScoreEvent(lead.id, "solicitou_proposta");
    await applyScoreEvent(lead.id, "solicitou_proposta");
    const saturated = await applyScoreEvent(lead.id, "solicitou_proposta");
    expect(saturated!.score).toBe(100);
  });

  it("never lets score go below zero", async () => {
    const contact = await makeContact("+5551977770003");
    const lead = await createLeadForContact({ contactId: contact.id });

    await applyScoreEvent(lead.id, "dias_sem_responder");
    const result = await applyScoreEvent(lead.id, "dias_sem_responder");
    expect(result!.score).toBe(0);
  });
});
