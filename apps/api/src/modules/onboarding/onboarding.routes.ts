import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";

const ONBOARDING_KEY = "onboarding";

export async function onboardingRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/onboarding/status", async () => {
    const row = db.select().from(schema.settings).where(eq(schema.settings.key, ONBOARDING_KEY)).get();
    return { completed: Boolean((row?.value as { completed?: boolean } | undefined)?.completed) };
  });

  app.post("/onboarding/complete", async () => {
    const existing = db.select().from(schema.settings).where(eq(schema.settings.key, ONBOARDING_KEY)).get();
    const value = { completed: true, completedAt: new Date().toISOString() };
    if (existing) {
      return db.update(schema.settings).set({ value }).where(eq(schema.settings.key, ONBOARDING_KEY)).returning().get();
    }
    return db.insert(schema.settings).values({ key: ONBOARDING_KEY, value }).returning().get();
  });
}
