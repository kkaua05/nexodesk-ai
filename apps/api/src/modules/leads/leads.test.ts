import { describe, expect, it } from "vitest";
import { findOrCreateContact } from "../contacts/contacts.service";
import { createLeadForContact, applyScoreEvent, findActiveLeadByContact } from "./leads.service";

function makeContact(phone: string) {
  return findOrCreateContact({ phone, firstMessageAt: new Date() }).contact;
}

describe("leads.service", () => {
  it("creates a lead with status 'novo' and an opportunity in 'novo_lead'", () => {
    const contact = makeContact("+5551977770001");
    const lead = createLeadForContact({ contactId: contact.id, firstMessage: "Quanto custa um site?" });

    expect(lead.status).toBe("novo");
    expect(lead.score).toBe(0);
    expect(findActiveLeadByContact(contact.id)?.id).toBe(lead.id);
  });

  it("accumulates score deltas from the rule engine and clamps at 100", () => {
    const contact = makeContact("+5551977770002");
    const lead = createLeadForContact({ contactId: contact.id });

    applyScoreEvent(lead.id, "solicitou_orcamento"); // +20
    applyScoreEvent(lead.id, "informou_orcamento"); // +15
    const afterTwo = applyScoreEvent(lead.id, "solicitou_proposta"); // +20 = 55
    expect(afterTwo.score).toBe(55);

    applyScoreEvent(lead.id, "solicitou_proposta");
    applyScoreEvent(lead.id, "solicitou_proposta");
    const saturated = applyScoreEvent(lead.id, "solicitou_proposta");
    expect(saturated.score).toBe(100);
  });

  it("never lets score go below zero", () => {
    const contact = makeContact("+5551977770003");
    const lead = createLeadForContact({ contactId: contact.id });

    applyScoreEvent(lead.id, "dias_sem_responder");
    const result = applyScoreEvent(lead.id, "dias_sem_responder");
    expect(result.score).toBe(0);
  });
});
