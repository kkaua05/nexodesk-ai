import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { schema } from "@nexodesk/database";
import { db } from "../../shared/database";
import { findOrCreateContact } from "../contacts/contacts.service";
import { createLeadForContact } from "../leads/leads.service";
import { moveOpportunity } from "./pipeline.service";

describe("moveOpportunity", () => {
  it("persists the stage change, writes history, and syncs the lead status", () => {
    const contact = findOrCreateContact({ phone: "+5551955550001", firstMessageAt: new Date() }).contact;
    const lead = createLeadForContact({ contactId: contact.id });
    const opportunity = db.select().from(schema.opportunities).where(eq(schema.opportunities.leadId, lead.id)).get()!;

    const moved = moveOpportunity(opportunity.id, "proposta", "tester", 0);
    expect(moved.stageKey).toBe("proposta");

    const history = db.select().from(schema.opportunityHistory).where(eq(schema.opportunityHistory.opportunityId, opportunity.id)).all();
    expect(history).toHaveLength(1);
    expect(history[0]?.fromStage).toBe("novo_lead");
    expect(history[0]?.toStage).toBe("proposta");

    const updatedLead = db.select().from(schema.leads).where(eq(schema.leads.id, lead.id)).get();
    expect(updatedLead?.status).toBe("proposta");
  });

  it("throws for a non-existent opportunity instead of silently doing nothing", () => {
    expect(() => moveOpportunity("does-not-exist", "proposta", "tester", 0)).toThrow();
  });
});
