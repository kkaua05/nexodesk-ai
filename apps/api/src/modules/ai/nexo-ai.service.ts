import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { formatCents } from "@nexodesk/shared";
import { safeAI } from "./ai.service.js";

const QUERY_TOOLS = [
  "leads_needing_followup",
  "receivables_this_month",
  "leads_by_service",
  "overdue_customers",
  "top_leads",
] as const;
type QueryTool = (typeof QUERY_TOOLS)[number];

const routeSchema = z.object({
  tool: z.enum(QUERY_TOOLS),
  serviceKeyword: z.string().nullable().default(null),
});

/**
 * "Nexo AI" query console (spec §41-42). The model only ever picks WHICH pre-built,
 * safe query to run — it never generates SQL and never writes the final numbers
 * itself, so the answer can't hallucinate data that isn't in the database.
 */
export async function askNexoAI(question: string) {
  const route = await safeAI((p) =>
    p
      .classifyIntent(
        `Escolha qual das seguintes consultas responde à pergunta do usuário: ${QUERY_TOOLS.join(", ")}.
Se a pergunta mencionar um serviço específico (ex: landing page), inclua em serviceKeyword.
Pergunta: "${question}"
Responda em JSON: {"tool": "...", "serviceKeyword": string|null}`,
      )
      .then((r) => routeSchema.parse({ tool: r.intent, serviceKeyword: r.service })),
  );

  const tool = route?.tool ?? guessToolFromKeywords(question);
  const result = runTool(tool, route?.serviceKeyword ?? undefined);

  return { tool, question, ...result };
}

function guessToolFromKeywords(question: string): QueryTool {
  const q = question.toLowerCase();
  if (q.includes("receber") || q.includes("faturamento") || q.includes("recebimento")) return "receivables_this_month";
  if (q.includes("atrasad") || q.includes("vencid")) return "overdue_customers";
  if (q.includes("melhor") || q.includes("quente") || q.includes("score")) return "top_leads";
  if (q.includes("landing") || q.includes("site") || q.includes("sistema") || q.includes("ecommerce") || q.includes("e-commerce")) return "leads_by_service";
  return "leads_needing_followup";
}

function runTool(tool: QueryTool, serviceKeyword?: string) {
  switch (tool) {
    case "leads_needing_followup": {
      const followUps = db.select().from(schema.followUps).all().filter((f) => !f.resolvedAt);
      const items = followUps.map((f) => {
        const lead = f.leadId ? db.select().from(schema.leads).where(eq(schema.leads.id, f.leadId)).get() : undefined;
        const contact = lead ? db.select().from(schema.contacts).where(eq(schema.contacts.id, lead.contactId)).get() : undefined;
        return { name: contact?.name ?? "Contato sem nome", reason: f.reason, note: f.note };
      });
      return { summary: `${items.length} lead(s)/proposta(s) precisam de follow-up.`, items };
    }

    case "receivables_this_month": {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const receivables = db.select().from(schema.accountsReceivable).all().filter((r) => r.dueDate >= start && r.dueDate <= end && r.status !== "pago");
      const totalCents = receivables.reduce((sum, r) => sum + (r.amountCents - r.paidAmountCents), 0);
      return { summary: `Você tem ${formatCents(totalCents)} a receber este mês (${receivables.length} conta(s)).`, items: receivables };
    }

    case "leads_by_service": {
      const services = db.select().from(schema.services).all();
      const match = serviceKeyword ? services.find((s) => s.name.toLowerCase().includes(serviceKeyword.toLowerCase())) : undefined;
      const leads = db.select().from(schema.leads).all().filter((l) => !match || l.serviceId === match.id);
      const items = leads.map((l) => {
        const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, l.contactId)).get();
        return { name: contact?.name ?? "Contato sem nome", status: l.status, score: l.score };
      });
      return { summary: `${items.length} lead(s) encontrados${match ? ` para ${match.name}` : ""}.`, items };
    }

    case "overdue_customers": {
      const overdue = db.select().from(schema.accountsReceivable).all().filter((r) => r.status === "vencido");
      const items = overdue.map((r) => {
        const customer = db.select().from(schema.customers).where(eq(schema.customers.id, r.customerId)).get();
        return { customer: customer?.name ?? "Cliente", description: r.description, amountCents: r.amountCents - r.paidAmountCents, dueDate: r.dueDate };
      });
      return { summary: `${items.length} cliente(s) com pagamento atrasado.`, items };
    }

    case "top_leads": {
      const leads = db.select().from(schema.leads).all().sort((a, b) => b.score - a.score).slice(0, 10);
      const items = leads.map((l) => {
        const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, l.contactId)).get();
        return { name: contact?.name ?? "Contato sem nome", score: l.score, status: l.status };
      });
      return { summary: `Seus ${items.length} melhores leads por pontuação.`, items };
    }
  }
}
