import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { NotFoundError, SOCKET_EVENTS, splitInstallments, createId } from "@nexodesk/shared";
import { emitEvent } from "../../shared/realtime.js";
import { nextDocumentNumber } from "../../shared/document-number.js";

export interface CloseSaleInput {
  leadId: string;
  serviceId: string;
  proposalId?: string;
  totalCents: number;
  downPaymentCents: number;
  installmentCount: number;
  paymentMethod: string;
  deliveryDays: number;
  responsibleUserId: string;
}

/**
 * "Venda ganha" (spec §22): a single DB transaction fans out into customer, sale,
 * project (+ stage checklist from the service template), and every receivable
 * installment. If any step fails, everything rolls back — no half-created state
 * (spec §93).
 */
export async function closeSale(input: CloseSaleInput) {
  const lead = (await (db.select().from(schema.leads).where(eq(schema.leads.id, input.leadId))))[0];
  if (!lead) throw new NotFoundError("Lead");

  const service = (await (db.select().from(schema.services).where(eq(schema.services.id, input.serviceId))))[0];
  if (!service) throw new NotFoundError("Serviço");

  const result = await db.transaction(async (tx) => {
    let customer = (await (db.select().from(schema.customers).where(eq(schema.customers.originLeadId, lead.id))))[0];
    if (!customer) {
      const contact = (await (tx.select().from(schema.contacts).where(eq(schema.contacts.id, lead.contactId))))[0];
      if (!contact) throw new NotFoundError("Contato");
      customer = (await (tx
              .insert(schema.customers)
              .values({ contactId: contact.id, originLeadId: lead.id, name: contact.name ?? contact.phoneNormalized, customerSince: new Date() })
              .returning()))[0]!;
    }

    const saleNumber = await nextDocumentNumber("VEN");
    const sale = (await (tx
          .insert(schema.sales)
          .values({
            number: saleNumber,
            customerId: customer.id,
            leadId: lead.id,
            serviceId: service.id,
            proposalId: input.proposalId,
            totalCents: input.totalCents,
            downPaymentCents: input.downPaymentCents,
            paymentMethod: input.paymentMethod,
            deliveryDays: input.deliveryDays,
            responsibleUserId: input.responsibleUserId,
          })
          .returning()))[0]!;

    const project = (await (tx
          .insert(schema.projects)
          .values({
            customerId: customer.id,
            serviceId: service.id,
            saleId: sale.id,
            name: `${service.name} — ${customer.name}`,
            status: "planejamento",
            valueCents: input.totalCents,
            responsibleUserId: input.responsibleUserId,
            startDate: new Date(),
            dueDate: new Date(Date.now() + input.deliveryDays * 24 * 60 * 60 * 1000),
          })
          .returning()))[0]!;

    const stageTemplates = (await (tx.select().from(schema.serviceStageTemplates).where(eq(schema.serviceStageTemplates.serviceId, service.id))));
    for (const template of stageTemplates) {
      (await (tx.insert(schema.projectStages).values({ projectId: project.id, name: template.name, order: template.order })));
    }

    const remainingCents = input.totalCents - input.downPaymentCents;
    const installmentAmounts = input.downPaymentCents > 0 ? [input.downPaymentCents, ...splitInstallments(remainingCents, input.installmentCount)] : splitInstallments(input.totalCents, input.installmentCount);

    for (const [index, amountCents] of installmentAmounts.entries()) {
      const dueDate = new Date(Date.now() + index * 30 * 24 * 60 * 60 * 1000);
      await tx.insert(schema.accountsReceivable).values({
        id: createId(),
        customerId: customer!.id,
        saleId: sale.id,
        projectId: project.id,
        description: index === 0 && input.downPaymentCents > 0 ? `Entrada — ${saleNumber}` : `Parcela ${index + 1}/${installmentAmounts.length} — ${saleNumber}`,
        installmentNumber: index + 1,
        installmentTotal: installmentAmounts.length,
        amountCents,
        dueDate,
        status: "pendente",
      });
    }

    (await (tx.update(schema.leads).set({ status: "ganho" }).where(eq(schema.leads.id, lead.id))));
    (await (tx.update(schema.opportunities).set({ stageKey: "fechado" }).where(eq(schema.opportunities.leadId, lead.id))));

    (await (tx.insert(schema.timelineEvents)
            .values([
              { customerId: customer.id, leadId: lead.id, type: "sale_won", title: "Venda fechada", valueCents: input.totalCents, occurredAt: new Date() },
              ...(input.downPaymentCents > 0
                ? [{ customerId: customer.id, type: "payment_created", title: "Entrada registrada", valueCents: input.downPaymentCents, occurredAt: new Date() }]
                : []),
              { customerId: customer.id, type: "project_created", title: "Projeto criado", occurredAt: new Date() },
            ])));

    return { customer, sale, project };
  });

  emitEvent(SOCKET_EVENTS.SALE_CREATED, { sale: result.sale });
  emitEvent(SOCKET_EVENTS.PROJECT_UPDATED, { project: result.project });

  // Audit trail for the conversion, independent of the enable/disable toggle —
  // this business action always runs when a user marks a sale as won (spec §22, §45).
  // The sale itself already committed above; a logging failure here must never turn
  // into a false failure response for a sale that actually succeeded.
  try {
    (await (db.insert(schema.automationRuns)
            .values({
              automationKey: "sale_conversion",
              startedAt: new Date(),
              finishedAt: new Date(),
              status: "sucesso",
              entityType: "sale",
              entityId: result.sale.id,
              result: { customerId: result.customer.id, projectId: result.project.id },
            })));
  } catch (error) {
    console.error("[sales] falha ao registrar log de auditoria da venda (venda já foi concluída):", error);
  }

  return result;
}
