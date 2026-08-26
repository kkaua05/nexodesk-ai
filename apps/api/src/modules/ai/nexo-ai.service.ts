import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { formatCents } from "@nexodesk/shared";
import { safeAI } from "./ai.service.js";
import type { ChatMessage } from "./ai-provider.js";

const QUERY_TOOLS = [
  "leads_needing_followup",
  "receivables_this_month",
  "leads_by_service",
  "overdue_customers",
  "top_leads",
] as const;
type QueryTool = (typeof QUERY_TOOLS)[number];

/** Anything that isn't a direct CRM data query falls here — a normal, free-form AI reply. */
const ALL_TOOLS = [...QUERY_TOOLS, "general_chat"] as const;
type AskTool = (typeof ALL_TOOLS)[number];

const routeSchema = z.object({
  tool: z.enum(ALL_TOOLS),
  serviceKeyword: z.string().nullable().default(null),
});

/**
 * "Nexo AI" query console (spec §41-42). For CRM data questions, the model only ever
 * picks WHICH pre-built, safe query to run — it never generates SQL and never writes
 * the final numbers itself, so the answer can't hallucinate data that isn't in the
 * database. Anything else (small talk, general questions) routes to a normal free-form
 * chat reply instead, so the assistant can actually hold a conversation.
 */
export async function askNexoAI(question: string, history: ChatMessage[] = []) {
  const route = await safeAI((p) =>
    p
      .classifyIntent(
        `Escolha qual das seguintes opções melhor atende à pergunta do usuário: ${ALL_TOOLS.join(", ")}.
Use "general_chat" quando a pergunta for uma conversa casual, saudação, dúvida geral, ou qualquer coisa que não seja uma consulta direta aos dados do CRM (leads, clientes, financeiro).
Se a pergunta mencionar um serviço específico (ex: landing page), inclua em serviceKeyword.
Pergunta: "${question}"
Responda em JSON: {"tool": "...", "serviceKeyword": string|null}`,
      )
      .then((r) => routeSchema.parse({ tool: r.intent, serviceKeyword: r.service })),
  );

  const tool = route?.tool ?? guessToolFromKeywords(question);

  if (tool === "general_chat") {
    const reply = await safeAI((p) => p.chat(question, history));
    return { tool, question, summary: reply ?? "Não consegui responder agora — tente novamente em instantes.", items: [] as never[] };
  }

  const result = await runTool(tool, route?.serviceKeyword ?? undefined);
  return { tool, question, ...result };
}

function guessToolFromKeywords(question: string): AskTool {
  const q = question.toLowerCase();
  if (q.includes("receber") || q.includes("faturamento") || q.includes("recebimento")) return "receivables_this_month";
  if (q.includes("atrasad") || q.includes("vencid")) return "overdue_customers";
  if (q.includes("melhor") || q.includes("quente") || q.includes("score")) return "top_leads";
  if (q.includes("landing") || q.includes("site") || q.includes("sistema") || q.includes("ecommerce") || q.includes("e-commerce")) return "leads_by_service";
  if (q.includes("follow") || q.includes("acompanhamento")) return "leads_needing_followup";
  return "general_chat";
}

async function runTool(tool: QueryTool, serviceKeyword?: string) {
  switch (tool) {
    case "leads_needing_followup": {
      const followUps = (await (db.select().from(schema.followUps))).filter((f) => !f.resolvedAt);
      const items = await Promise.all(
        followUps.map(async (f) => {
          const lead = f.leadId ? (await (db.select().from(schema.leads).where(eq(schema.leads.id, f.leadId))))[0] : undefined;
          const contact = lead ? (await (db.select().from(schema.contacts).where(eq(schema.contacts.id, lead.contactId))))[0] : undefined;
          return { name: contact?.name ?? "Contato sem nome", reason: f.reason, note: f.note };
        }),
      );
      return { summary: `${items.length} lead(s)/proposta(s) precisam de follow-up.`, items };
    }

    case "receivables_this_month": {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const receivables = (await (db.select().from(schema.accountsReceivable))).filter((r) => r.dueDate >= start && r.dueDate <= end && r.status !== "pago");
      const totalCents = receivables.reduce((sum, r) => sum + (r.amountCents - r.paidAmountCents), 0);
      const items = await Promise.all(
        receivables.map(async (r) => {
          const customer = (await (db.select().from(schema.customers).where(eq(schema.customers.id, r.customerId))))[0];
          return {
            customer: customer?.name ?? "Cliente",
            description: r.description,
            amountCents: r.amountCents - r.paidAmountCents,
            dueDate: r.dueDate,
            status: r.status,
          };
        }),
      );
      return { summary: `Você tem ${formatCents(totalCents)} a receber este mês (${items.length} conta(s)).`, items };
    }

    case "leads_by_service": {
      const services = (await (db.select().from(schema.services)));
      const match = serviceKeyword ? services.find((s) => s.name.toLowerCase().includes(serviceKeyword.toLowerCase())) : undefined;
      const leads = (await (db.select().from(schema.leads))).filter((l) => !match || l.serviceId === match.id);
      const items = await Promise.all(
        leads.map(async (l) => {
          const contact = (await (db.select().from(schema.contacts).where(eq(schema.contacts.id, l.contactId))))[0];
          return { name: contact?.name ?? "Contato sem nome", status: l.status, score: l.score };
        }),
      );
      return { summary: `${items.length} lead(s) encontrados${match ? ` para ${match.name}` : ""}.`, items };
    }

    case "overdue_customers": {
      const overdue = (await (db.select().from(schema.accountsReceivable))).filter((r) => r.status === "vencido");
      const items = await Promise.all(
        overdue.map(async (r) => {
          const customer = (await (db.select().from(schema.customers).where(eq(schema.customers.id, r.customerId))))[0];
          return { customer: customer?.name ?? "Cliente", description: r.description, amountCents: r.amountCents - r.paidAmountCents, dueDate: r.dueDate };
        }),
      );
      return { summary: `${items.length} cliente(s) com pagamento atrasado.`, items };
    }

    case "top_leads": {
      const leads = (await (db.select().from(schema.leads))).sort((a, b) => b.score - a.score).slice(0, 10);
      const items = await Promise.all(
        leads.map(async (l) => {
          const contact = (await (db.select().from(schema.contacts).where(eq(schema.contacts.id, l.contactId))))[0];
          return { name: contact?.name ?? "Contato sem nome", score: l.score, status: l.status };
        }),
      );
      return { summary: `Seus ${items.length} melhores leads por pontuação.`, items };
    }
  }
}
