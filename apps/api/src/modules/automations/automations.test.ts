import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { schema } from "@nexodesk/database";
import { db } from "../../shared/database";
import { runAutomation, isAutomationEnabled } from "./automations.service";

describe("runAutomation", () => {
  it("runs the function and logs a 'sucesso' entry when the automation is enabled (default)", async () => {
    const result = await runAutomation("lead_auto_create", { type: "test", id: "abc" }, () => ({ done: true }));
    expect(result).toEqual({ done: true });

    const runs = db.select().from(schema.automationRuns).where(eq(schema.automationRuns.entityId, "abc")).all();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("sucesso");
  });

  it("logs a 'pulado' entry and never calls the function when the automation is disabled in settings", async () => {
    db.insert(schema.settings).values({ key: "automations", value: { lead_ai_analysis: false } }).run();
    expect(isAutomationEnabled("lead_ai_analysis")).toBe(false);

    let called = false;
    const result = await runAutomation("lead_ai_analysis", { type: "test", id: "xyz" }, () => {
      called = true;
      return "should not run";
    });

    expect(called).toBe(false);
    expect(result).toBeUndefined();

    const runs = db.select().from(schema.automationRuns).where(eq(schema.automationRuns.entityId, "xyz")).all();
    expect(runs[0]?.status).toBe("pulado");
  });

  it("logs an 'erro' entry and swallows the exception instead of crashing the caller", async () => {
    const result = await runAutomation("payment_overdue", { type: "test", id: "err1" }, () => {
      throw new Error("boom");
    });

    expect(result).toBeUndefined();
    const runs = db.select().from(schema.automationRuns).where(eq(schema.automationRuns.entityId, "err1")).all();
    expect(runs[0]?.status).toBe("erro");
    expect(runs[0]?.error).toBe("boom");
  });
});
