import { buildApp } from "./app.js";
import { env } from "./shared/env.js";
import { initRealtime } from "./shared/realtime.js";
import { initWhatsapp, autoReconnectWhatsappIfSessionExists } from "./modules/whatsapp/whatsapp.service.js";
import { startAutomationScheduler } from "./modules/automations/scheduler.js";

// whatsapp-web.js drives a Puppeteer page whose internal event handlers (page
// navigation, context teardown on reconnect) throw outside any promise chain we
// control — e.g. "Execution context was destroyed, most likely because of a
// navigation" from Client.inject(). Node treats an unhandled rejection as fatal by
// default, which used to take down the whole API (and every unrelated route with
// it) whenever the WhatsApp session merely reconnected. Logging and continuing is
// the correct response here: the WhatsAppWebProvider already has its own
// reconnect/backoff logic (see whatsapp-web.provider.ts) for the session itself.
process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandledRejection (não fatal):", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[server] uncaughtException (não fatal):", error);
});

async function main() {
  const app = buildApp();
  await app.ready();

  initRealtime(app.server);
  initWhatsapp();
  const schedulerHandle = startAutomationScheduler();

  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`NexoDesk AI API rodando em http://${env.HOST}:${env.PORT}`);

  void autoReconnectWhatsappIfSessionExists();

  const shutdown = async () => {
    clearInterval(schedulerHandle);
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("[server] falha ao iniciar:", error);
  process.exit(1);
});
