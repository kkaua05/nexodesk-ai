import type { FastifyInstance } from "fastify";
import { desc } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { isAutomationEnabled, type AutomationKey } from "./automations.service.js";

export async function automationsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/automations", async () => {
    const automations = (await (db.select().from(schema.automations)));
    return Promise.all(automations.map(async (a) => ({ ...a, isEnabled: await isAutomationEnabled(a.key as AutomationKey) })));
  });

  app.get("/automations/runs", async () => {
    return (await (db.select().from(schema.automationRuns).orderBy(desc(schema.automationRuns.startedAt)).limit(50)));
  });
}
