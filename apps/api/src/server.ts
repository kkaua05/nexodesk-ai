import { buildApp } from "./app.js";
import { env } from "./shared/env.js";
import { initRealtime } from "./shared/realtime.js";
import { initWhatsapp, autoReconnectWhatsappIfSessionExists } from "./modules/whatsapp/whatsapp.service.js";
import { startAutomationScheduler } from "./modules/automations/scheduler.js";

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
