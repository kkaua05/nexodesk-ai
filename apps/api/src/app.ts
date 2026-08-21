import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { env } from "./shared/env.js";
import { registerErrorHandler } from "./shared/error-handler.js";
import authPlugin from "./plugins/auth.js";

import { authRoutes } from "./modules/auth/auth.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { whatsappRoutes } from "./modules/whatsapp/whatsapp.routes.js";
import { conversationsRoutes } from "./modules/conversations/conversations.routes.js";
import { leadsRoutes } from "./modules/leads/leads.routes.js";
import { pipelineRoutes } from "./modules/pipeline/pipeline.routes.js";
import { customersRoutes } from "./modules/customers/customers.routes.js";
import { servicesRoutes } from "./modules/services/services.routes.js";
import { proposalsRoutes } from "./modules/proposals/proposals.routes.js";
import { salesRoutes } from "./modules/sales/sales.routes.js";
import { projectsRoutes } from "./modules/projects/projects.routes.js";
import { tasksRoutes } from "./modules/tasks/tasks.routes.js";
import { financeRoutes } from "./modules/finance/finance.routes.js";
import { calendarRoutes } from "./modules/calendar/calendar.routes.js";
import { followupsRoutes } from "./modules/followups/followups.routes.js";
import { automationsRoutes } from "./modules/automations/automations.routes.js";
import { notificationsRoutes } from "./modules/notifications/notifications.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import { aiRoutes } from "./modules/ai/ai.routes.js";
import { settingsRoutes } from "./modules/settings/settings.routes.js";
import { searchRoutes } from "./modules/search/search.routes.js";
import { notesRoutes } from "./modules/notes/notes.routes.js";
import { attachmentsRoutes } from "./modules/attachments/attachments.routes.js";
import { reportsRoutes } from "./modules/reports/reports.routes.js";
import { onboardingRoutes } from "./modules/onboarding/onboarding.routes.js";

export function buildApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === "development"
        ? { level: "info", transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } } }
        : { level: "info" },
  });

  registerErrorHandler(app);

  app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  app.register(rateLimit, { global: true, max: 200, timeWindow: "1 minute" });
  app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024 } });
  app.register(authPlugin);

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  app.register(authRoutes, { prefix: "/api" });
  app.register(usersRoutes, { prefix: "/api" });
  app.register(whatsappRoutes, { prefix: "/api" });
  app.register(conversationsRoutes, { prefix: "/api" });
  app.register(leadsRoutes, { prefix: "/api" });
  app.register(pipelineRoutes, { prefix: "/api" });
  app.register(customersRoutes, { prefix: "/api" });
  app.register(servicesRoutes, { prefix: "/api" });
  app.register(proposalsRoutes, { prefix: "/api" });
  app.register(salesRoutes, { prefix: "/api" });
  app.register(projectsRoutes, { prefix: "/api" });
  app.register(tasksRoutes, { prefix: "/api" });
  app.register(financeRoutes, { prefix: "/api" });
  app.register(calendarRoutes, { prefix: "/api" });
  app.register(followupsRoutes, { prefix: "/api" });
  app.register(automationsRoutes, { prefix: "/api" });
  app.register(notificationsRoutes, { prefix: "/api" });
  app.register(dashboardRoutes, { prefix: "/api" });
  app.register(aiRoutes, { prefix: "/api" });
  app.register(settingsRoutes, { prefix: "/api" });
  app.register(searchRoutes, { prefix: "/api" });
  app.register(notesRoutes, { prefix: "/api" });
  app.register(attachmentsRoutes, { prefix: "/api" });
  app.register(reportsRoutes, { prefix: "/api" });
  app.register(onboardingRoutes, { prefix: "/api" });

  return app;
}
