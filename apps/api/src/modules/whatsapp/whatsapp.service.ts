import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { emitEvent } from "../../shared/realtime.js";
import { SOCKET_EVENTS } from "@nexodesk/shared";
import { env } from "../../shared/env.js";
import { registerMessageHandler } from "./message-handler.js";
import type { MessagingProvider, ConnectionStatus } from "./messaging-provider.js";

const PROVIDER_KEY = "whatsapp";

let provider: MessagingProvider | undefined;
let lastQr: string | undefined;

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
      persistIntegrationStatus(status);
      emitEvent(SOCKET_EVENTS.WHATSAPP_STATUS_CHANGED, { ...status });
    });
  }
  return provider;
}

/** No-op kept for server.ts's explicit boot sequence — construction itself is lazy. */
export function initWhatsapp() {
  // intentionally empty: see getProvider()
}

function persistIntegrationStatus(status: ConnectionStatus) {
  const existing = db.select().from(schema.integrations).where(eq(schema.integrations.provider, PROVIDER_KEY)).get();
  const payload = {
    provider: PROVIDER_KEY,
    status: status.status,
    config: { phoneNumber: status.phoneNumber, deviceInfo: status.deviceInfo },
    lastConnectedAt: status.connectedSince?.toISOString(),
  };
  if (existing) {
    db.update(schema.integrations).set(payload).where(eq(schema.integrations.id, existing.id)).run();
  } else {
    db.insert(schema.integrations).values(payload).run();
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

export async function sendWhatsappMessage(recipient: string, message: string): Promise<void> {
  const p = await getProvider();
  await p.sendMessage(recipient, message);
}

export function getLastQrCode(): string | undefined {
  return lastQr;
}
