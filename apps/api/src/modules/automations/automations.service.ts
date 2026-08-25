import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { emitEvent } from "../../shared/realtime.js";
import { SOCKET_EVENTS } from "@nexodesk/shared";

export type AutomationKey =
  | "lead_auto_create"
  | "lead_ai_analysis"
  | "whatsapp_ai_auto_reply"
  | "sale_conversion"
  | "payment_due_soon"
  | "payment_overdue"
  | "lead_inactivity_followup";

export function isAutomationEnabled(key: AutomationKey): boolean {
  const row = db.select().from(schema.settings).where(eq(schema.settings.key, "automations")).get();
  const map = (row?.value as Record<string, boolean> | undefined) ?? {};
  return map[key] ?? true;
}

/**
 * Every automation execution is logged (spec §45) — success, failure, or skip.
 * Automations must never fail silently or run invisibly.
 */
export async function runAutomation<T>(
  key: AutomationKey,
  entity: { type: string; id: string } | undefined,
  fn: () => Promise<T> | T,
): Promise<T | undefined> {
  const startedAt = new Date();

  if (!isAutomationEnabled(key)) {
    db.insert(schema.automationRuns)
      .values({ automationKey: key, startedAt, finishedAt: new Date(), status: "pulado", entityType: entity?.type, entityId: entity?.id })
      .run();
    return undefined;
  }

  try {
    const result = await fn();
    db.insert(schema.automationRuns)
      .values({
        automationKey: key,
        startedAt,
        finishedAt: new Date(),
        status: "sucesso",
        entityType: entity?.type,
        entityId: entity?.id,
        result: result === undefined ? null : (result as Record<string, unknown>),
      })
      .run();
    emitEvent(SOCKET_EVENTS.AUTOMATION_RUN_COMPLETED, { key, status: "sucesso", entity });
    return result;
  } catch (error) {
    db.insert(schema.automationRuns)
      .values({
        automationKey: key,
        startedAt,
        finishedAt: new Date(),
        status: "erro",
        entityType: entity?.type,
        entityId: entity?.id,
        error: (error as Error).message,
      })
      .run();
    emitEvent(SOCKET_EVENTS.AUTOMATION_RUN_COMPLETED, { key, status: "erro", entity });
    // Automations must never take down the request/message flow that triggered them.
    return undefined;
  }
}
