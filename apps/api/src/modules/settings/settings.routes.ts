import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { aiProvider, aiProviderName } from "../ai/ai.service.js";

const companySchema = z.object({
  name: z.string().min(2),
  logo: z.string().optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  currency: z.string().default("BRL"),
  timezone: z.string().default("America/Sao_Paulo"),
});

const automationsSchema = z.record(z.string(), z.boolean());

function getSetting(key: string) {
  return db.select().from(schema.settings).where(eq(schema.settings.key, key)).get()?.value;
}

function setSetting(key: string, value: unknown) {
  const existing = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get();
  if (existing) {
    return db.update(schema.settings).set({ value }).where(eq(schema.settings.key, key)).returning().get();
  }
  return db.insert(schema.settings).values({ key, value }).returning().get();
}

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/settings/company", async () => getSetting("company"));

  app.put("/settings/company", { onRequest: [app.authenticate, app.requireRole("owner")] }, async (request) => {
    const body = companySchema.parse(request.body);
    return setSetting("company", body);
  });

  app.get("/settings/ai", async () => {
    const available = await aiProvider.isAvailable();
    return { ...(getSetting("ai") as object), model: aiProvider.modelName, provider: aiProviderName, status: available ? "online" : "offline" };
  });

  app.get("/settings/ai/test", async () => {
    const available = await aiProvider.isAvailable();
    return { available };
  });

  app.get("/settings/automations", async () => getSetting("automations"));

  app.put("/settings/automations", { onRequest: [app.authenticate, app.requireRole("owner")] }, async (request) => {
    const body = automationsSchema.parse(request.body);
    return setSetting("automations", body);
  });

  app.get("/settings/integrations", async () => db.select().from(schema.integrations).all());
}
