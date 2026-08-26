import type { FastifyInstance } from "fastify";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { getFinancialOverview } from "../finance/finance.service.js";
import { getAgenda } from "../calendar/calendar.service.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/dashboard/summary", async () => {
    const leads = (await (db.select().from(schema.leads)));
    const conversations = (await (db.select().from(schema.conversations)));
    const proposals = (await (db.select().from(schema.proposals)));
    const opportunities = (await (db.select().from(schema.opportunities)));
    const projects = (await (db.select().from(schema.projects)));
    const financial = await getFinancialOverview();

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return {
      newLeadsLast7Days: leads.filter((l) => l.createdAt.getTime() > sevenDaysAgo).length,
      conversationsAwaiting: conversations.filter((c) => c.status === "aguardando_resposta").length,
      openProposals: proposals.filter((p) => p.status === "enviada" || p.status === "visualizada").length,
      pipelineValueCents: opportunities.reduce((sum, o) => sum + (o.valueCents ?? 0), 0),
      activeProjects: projects.filter((p) => !["concluido", "cancelado"].includes(p.status)).length,
      financial,
    };
  });

  app.get("/dashboard/today", async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return getAgenda(start, end);
  });

  app.get("/dashboard/charts/leads-by-period", async () => {
    const leads = (await (db.select().from(schema.leads)));
    const buckets = new Map<string, number>();
    for (const lead of leads) {
      const key = lead.createdAt.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  });

  app.get("/dashboard/charts/revenue-vs-expenses", async () => {
    const receivables = (await (db.select().from(schema.accountsReceivable)));
    const payables = (await (db.select().from(schema.accountsPayable)));
    const buckets = new Map<string, { revenueCents: number; expensesCents: number }>();

    for (const r of receivables) {
      const key = r.dueDate.toISOString().slice(0, 7);
      const bucket = buckets.get(key) ?? { revenueCents: 0, expensesCents: 0 };
      bucket.revenueCents += r.paidAmountCents;
      buckets.set(key, bucket);
    }
    for (const p of payables) {
      const key = p.dueDate.toISOString().slice(0, 7);
      const bucket = buckets.get(key) ?? { revenueCents: 0, expensesCents: 0 };
      if (p.status === "pago") bucket.expensesCents += p.amountCents;
      buckets.set(key, bucket);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({ month, ...values }));
  });

  app.get("/dashboard/charts/services-sold", async () => {
    const sales = (await (db.select().from(schema.sales)));
    const services = (await (db.select().from(schema.services)));
    const counts = new Map<string, number>();
    for (const sale of sales) {
      if (!sale.serviceId) continue;
      counts.set(sale.serviceId, (counts.get(sale.serviceId) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([serviceId, count]) => ({
      service: services.find((s) => s.id === serviceId)?.name ?? "Outro",
      count,
    }));
  });

  app.get("/dashboard/charts/leads-by-origin", async () => {
    const leads = (await (db.select().from(schema.leads)));
    const counts = new Map<string, number>();
    for (const lead of leads) counts.set(lead.origin, (counts.get(lead.origin) ?? 0) + 1);
    return Array.from(counts.entries()).map(([origin, count]) => ({ origin, count }));
  });
}
