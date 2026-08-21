import type { FastifyInstance } from "fastify";
import { desc } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { isAutomationEnabled, type AutomationKey } from "./automations.service.js";

export async function automationsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/automations", async () => {
    const automations = db.select().from(schema.automations).all();
    return automations.map((a) => ({ ...a, isEnabled: isAutomationEnabled(a.key as AutomationKey) }));
  });

  app.get("/automations/runs", async () => {
    return db.select().from(schema.automationRuns).orderBy(desc(schema.automationRuns.startedAt)).limit(50).all();
  });
}
