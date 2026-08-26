import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { emitEvent } from "../../shared/realtime.js";
import { SOCKET_EVENTS } from "@nexodesk/shared";
import { env } from "../../shared/env.js";
import { registerMessageHandler } from "./message-handler.js";
import { createNotification } from "../notifications/notifications.service.js";
import type { MessagingProvider, ConnectionStatus, SendResult, SendMediaInput } from "./messaging-provider.js";
import type { WhatsappConnectionStatus } from "@nexodesk/shared";

const PROVIDER_KEY = "whatsapp";

let provider: MessagingProvider | undefined;
let lastQr: string | undefined;
let previousStatus: WhatsappConnectionStatus | undefined;

/**
 * Lazily constructs the WhatsApp provider on first use rather than as a module-level
 * side effect. whatsapp-web.js pulls in native dependencies (via Puppeteer) that,
 * combined with other native addons loaded at startup (e.g. argon2), triggered a
 * native V8 cleanup-hook crash on Node 24/Windows when constructed eagerly at import
 * time. Deferring construction until the app has finished booting avoids the
 * collision — see docs/architecture.md "Known Limitations".
 */
async function getProvider(): Promise<MessagingProvider> {
  if (!provider) {
    const { WhatsAppWebProvider } = await import("./whatsapp-web.provider.js");
    provider = new WhatsAppWebProvider({ sessionPath: env.WHATSAPP_SESSION_PATH });
    registerMessageHandler(provider);

    provider.on("qr", (qr) => {
      lastQr = qr;
      emitEvent(SOCKET_EVENTS.WHATSAPP_QR, { qr });
    });

    provider.on("status", (status) => {
      if (status.status === "conectado") lastQr = undefined;

      // Only alert on a real drop (was connected, now isn't) — never on the initial
      // "desconectado" before the user has connected for the first time.
      if (previousStatus === "conectado" && (status.status === "desconectado" || status.status === "erro")) {
        createNotification({
          type: "whatsapp_desconectado",
          title: "WhatsApp desconectado",
          body: status.lastError ?? "A conexão com o WhatsApp caiu. Reconecte em Configurações → Integrações.",
        }).catch((error) => console.error("[whatsapp] falha ao criar notificação de desconexão:", error));
      }
      previousStatus = status.status;

      persistIntegrationStatus(status).catch((error) => console.error("[whatsapp] falha ao persistir status da integração:", error));
      emitEvent(SOCKET_EVENTS.WHATSAPP_STATUS_CHANGED, { ...status });
    });
  }
  return provider;
}

/** No-op kept for server.ts's explicit boot sequence — construction itself is lazy. */
export function initWhatsapp() {
  // intentionally empty: see getProvider()
}

async function persistIntegrationStatus(status: ConnectionStatus) {
  const existing = (await (db.select().from(schema.integrations).where(eq(schema.integrations.provider, PROVIDER_KEY))))[0];
  const payload = {
    provider: PROVIDER_KEY,
    status: status.status,
    config: { phoneNumber: status.phoneNumber, deviceInfo: status.deviceInfo },
    lastConnectedAt: status.connectedSince?.toISOString(),
  };
  if (existing) {
    (await (db.update(schema.integrations).set(payload).where(eq(schema.integrations.id, existing.id))));
  } else {
    (await (db.insert(schema.integrations).values(payload)));
  }
}

export async function connectWhatsapp() {
  const p = await getProvider();
  await p.connect();
}

export async function disconnectWhatsapp() {
  const p = await getProvider();
  await p.disconnect();
}

export async function clearWhatsappSession() {
  const p = await getProvider();
  await p.clearSession();
}

export async function getWhatsappStatus(): Promise<ConnectionStatus> {
  if (!provider) return { status: "desconectado" };
  return provider.getConnectionStatus();
}

export async function sendWhatsappMessage(recipient: string, message: string): Promise<SendResult> {
  const p = await getProvider();
  return p.sendMessage(recipient, message);
}

export async function sendWhatsappMedia(recipient: string, media: SendMediaInput): Promise<SendResult> {
  const p = await getProvider();
  return p.sendMedia(recipient, media);
}

/**
 * Reconnects automatically on server boot when a previously authenticated session is
 * present on disk — otherwise every API restart would silently drop the WhatsApp
 * connection and require the user to click "Conectar" and wait, even though nothing
 * about their WhatsApp login actually changed (spec §6: session persisted locally).
 */
export async function autoReconnectWhatsappIfSessionExists(): Promise<void> {
  const { existsSync, readdirSync } = await import("node:fs");
  const path = await import("node:path");
  const sessionDir = path.join(env.WHATSAPP_SESSION_PATH, "session");

  if (!existsSync(sessionDir) || readdirSync(sessionDir).length === 0) return;

  try {
    await connectWhatsapp();
  } catch (error) {
    console.error("[whatsapp] falha ao reconectar automaticamente:", error);
  }
}

export function getLastQrCode(): string | undefined {
  return lastQr;
}
