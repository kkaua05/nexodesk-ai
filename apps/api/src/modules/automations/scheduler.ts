import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { runAutomation } from "./automations.service.js";
import { markOverdueReceivables } from "../finance/finance.service.js";
import { detectInactiveLeads, detectStalledProposals } from "../followups/followups.service.js";
import { createNotification } from "../notifications/notifications.service.js";

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 min — light enough for a local desktop app

async function checkPaymentsDueSoon() {
  await runAutomation("payment_due_soon", undefined, () => {
    const in24h = Date.now() + 24 * 60 * 60 * 1000;
    const soon = db
      .select()
      .from(schema.accountsReceivable)
      .all()
      .filter((r) => (r.status === "pendente" || r.status === "parcial") && r.dueDate.getTime() <= in24h && r.dueDate.getTime() > Date.now());

    for (const receivable of soon) {
      createNotification({
        type: "pagamento",
        title: "Pagamento vence em breve",
        body: receivable.description,
        entityType: "accounts_receivable",
        entityId: receivable.id,
      });
    }
    return { count: soon.length };
  });
}

async function checkOverduePayments() {
  await runAutomation("payment_overdue", undefined, () => {
    const overdueBefore = db.select().from(schema.accountsReceivable).all().filter((r) => r.status === "vencido").map((r) => r.id);
    const count = markOverdueReceivables();
    const newlyOverdue = db
      .select()
      .from(schema.accountsReceivable)
      .all()
      .filter((r) => r.status === "vencido" && !overdueBefore.includes(r.id));

    for (const receivable of newlyOverdue) {
      createNotification({ type: "atraso", title: "Pagamento em atraso", body: receivable.description, entityType: "accounts_receivable", entityId: receivable.id });
    }
    return { count };
  });
}

async function checkInactiveLeads() {
  await runAutomation("lead_inactivity_followup", undefined, () => {
    const count = detectInactiveLeads() + detectStalledProposals();
    return { count };
  });
}

export function startAutomationScheduler() {
  const tick = async () => {
    await checkPaymentsDueSoon();
    await checkOverduePayments();
    await checkInactiveLeads();
  };

  tick();
  return setInterval(tick, CHECK_INTERVAL_MS);
}
