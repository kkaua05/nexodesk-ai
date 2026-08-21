import { eq } from "drizzle-orm";
import { db } from "../../shared/database.js";
import { schema } from "@nexodesk/database";
import { emitEvent } from "../../shared/realtime.js";
import { SOCKET_EVENTS } from "@nexodesk/shared";
import { env } from "../../shared/env.js";
import { WhatsAppWebProvider } from "./whatsapp-web.provider.js";
import { registerMessageHandler } from "./message-handler.js";
import type { MessagingProvider, ConnectionStatus } from "./messaging-provider.js";

const PROVIDER_KEY = "whatsapp";

export const whatsappProvider: MessagingProvider = new WhatsAppWebProvider({
  sessionPath: env.WHATSAPP_SESSION_PATH,
});

let lastQr: string | undefined;

export function initWhatsapp() {
  registerMessageHandler(whatsappProvider);

  whatsappProvider.on("qr", (qr) => {
    lastQr = qr;
    emitEvent(SOCKET_EVENTS.WHATSAPP_QR, { qr });
  });

  whatsappProvider.on("status", (status) => {
    if (status.status === "conectado") lastQr = undefined;
    persistIntegrationStatus(status);
    emitEvent(SOCKET_EVENTS.WHATSAPP_STATUS_CHANGED, { ...status });
  });
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
  await whatsappProvider.connect();
}

export async function disconnectWhatsapp() {
  await whatsappProvider.disconnect();
}

export async function clearWhatsappSession() {
  await whatsappProvider.clearSession();
}

export async function getWhatsappStatus(): Promise<ConnectionStatus> {
  return whatsappProvider.getConnectionStatus();
}

export function getLastQrCode(): string | undefined {
  return lastQr;
}
