import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { toCsv } from "../../shared/csv.js";
import { fromCents } from "@nexodesk/shared";

function sendCsv(reply: import("fastify").FastifyReply, filename: string, csv: string) {
  return reply.header("Content-Disposition", `attachment; filename="${filename}"`).type("text/csv; charset=utf-8").send(csv);
}

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/reports/leads.csv", async (_request, reply) => {
    const leads = db.select().from(schema.leads).all();
    const rows = leads.map((lead) => {
      const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, lead.contactId)).get();
      return {
        nome: contact?.name ?? "",
        telefone: contact?.phoneNormalized ?? "",
        status: lead.status,
        origem: lead.origin,
        score: lead.score,
        valorPotencial: lead.potentialValueCents ? fromCents(lead.potentialValueCents) : "",
        criadoEm: lead.createdAt.toISOString(),
      };
    });
    const csv = toCsv(rows, [
      { key: "nome", label: "Nome" },
      { key: "telefone", label: "Telefone" },
      { key: "status", label: "Status" },
      { key: "origem", label: "Origem" },
      { key: "score", label: "Score" },
      { key: "valorPotencial", label: "Valor potencial" },
      { key: "criadoEm", label: "Criado em" },
    ]);
    return sendCsv(reply, "leads.csv", csv);
  });

  app.get("/reports/proposals.csv", async (_request, reply) => {
    const proposals = db.select().from(schema.proposals).all();
    const rows = proposals.map((p) => ({
      numero: p.number,
      status: p.status,
      valor: fromCents(p.totalCents),
      criadoEm: p.createdAt.toISOString(),
      validade: p.validUntil?.toISOString() ?? "",
    }));
    const csv = toCsv(rows, [
      { key: "numero", label: "Número" },
      { key: "status", label: "Status" },
      { key: "valor", label: "Valor" },
      { key: "criadoEm", label: "Criado em" },
      { key: "validade", label: "Validade" },
    ]);
    return sendCsv(reply, "propostas.csv", csv);
  });

  app.get("/reports/receivables.csv", async (_request, reply) => {
    const receivables = db.select().from(schema.accountsReceivable).all();
    const rows = receivables.map((r) => {
      const customer = db.select().from(schema.customers).where(eq(schema.customers.id, r.customerId)).get();
      return {
        cliente: customer?.name ?? "",
        descricao: r.description,
        valor: fromCents(r.amountCents),
        pago: fromCents(r.paidAmountCents),
        vencimento: r.dueDate.toISOString(),
        status: r.status,
      };
    });
    const csv = toCsv(rows, [
      { key: "cliente", label: "Cliente" },
      { key: "descricao", label: "Descrição" },
      { key: "valor", label: "Valor" },
      { key: "pago", label: "Pago" },
      { key: "vencimento", label: "Vencimento" },
      { key: "status", label: "Status" },
    ]);
    return sendCsv(reply, "contas-a-receber.csv", csv);
  });

  app.get("/reports/sales.csv", async (_request, reply) => {
    const sales = db.select().from(schema.sales).all();
    const rows = sales.map((s) => {
      const customer = db.select().from(schema.customers).where(eq(schema.customers.id, s.customerId)).get();
      return {
        numero: s.number,
        cliente: customer?.name ?? "",
        valor: fromCents(s.totalCents),
        formaPagamento: s.paymentMethod ?? "",
        criadoEm: s.createdAt.toISOString(),
      };
    });
    const csv = toCsv(rows, [
      { key: "numero", label: "Número" },
      { key: "cliente", label: "Cliente" },
      { key: "valor", label: "Valor" },
      { key: "formaPagamento", label: "Forma de pagamento" },
      { key: "criadoEm", label: "Criado em" },
    ]);
    return sendCsv(reply, "vendas.csv", csv);
  });
}
