import pkg from "whatsapp-web.js";
import type { Client as WWebClient, Message } from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import QRCode from "qrcode";
import { rmSync } from "node:fs";
import { BaseMessagingProvider, type ConnectionStatus } from "./messaging-provider.js";
import { whatsappJidToPhone } from "@nexodesk/shared";

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 3000;

const WHATSAPP_MESSAGE_TYPE_MAP: Record<string, string> = {
  chat: "texto",
  image: "imagem",
  ptt: "audio",
  audio: "audio",
  video: "video",
  document: "documento",
  sticker: "sticker",
  location: "localizacao",
};

/**
 * whatsapp-web.js is an unofficial integration (spec §6): this provider owns all
 * reconnection/session/rate-limit concerns so the rest of the app never has to think
 * about Puppeteer, DOM scraping, or WhatsApp Web internals.
 */
export class WhatsAppWebProvider extends BaseMessagingProvider {
  private client: WWebClient;
  private status: ConnectionStatus = { status: "desconectado" };
  private reconnectAttempts = 0;
  private reconnecting = false;
  private lastSentAt = 0;
  private readonly minSendIntervalMs: number;
  private readonly sessionPath: string;

  constructor(options: { sessionPath: string; minSendIntervalMs?: number }) {
    super();
    this.sessionPath = options.sessionPath;
    this.minSendIntervalMs = options.minSendIntervalMs ?? 1500;

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: this.sessionPath }),
      puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
    });

    this.wireEvents();
  }

  private wireEvents() {
    this.client.on("qr", async (qr: string) => {
      this.setStatus({ status: "qr_necessario" });
      const dataUrl = await QRCode.toDataURL(qr);
      this.emit("qr", dataUrl);
    });

    this.client.on("authenticated", () => {
      this.reconnectAttempts = 0;
    });

    this.client.on("ready", () => {
      const phoneNumber = this.client.info?.wid?.user;
      this.setStatus({
        status: "conectado",
        phoneNumber,
        connectedSince: new Date(),
        deviceInfo: this.client.info?.platform,
      });
    });

    this.client.on("disconnected", (reason: string) => {
      this.setStatus({ status: "desconectado", lastError: String(reason) });
      this.scheduleReconnect();
    });

    this.client.on("auth_failure", (message: string) => {
      this.setStatus({ status: "erro", lastError: message });
    });

    this.client.on("message", async (message: Message) => {
      if (message.isStatus || message.fromMe) return;

      const contact = await message.getContact().catch(() => undefined);
      const media = message.hasMedia ? await message.downloadMedia().catch(() => undefined) : undefined;

      this.emit("message", {
        externalMessageId: message.id._serialized,
        externalChatId: message.from,
        fromPhone: whatsappJidToPhone(message.from),
        fromName: contact?.pushname ?? contact?.name,
        avatarUrl: await contact?.getProfilePicUrl().catch(() => undefined),
        body: message.body,
        mediaUrl: media ? `data:${media.mimetype};base64,${media.data}` : undefined,
        type: (WHATSAPP_MESSAGE_TYPE_MAP[message.type] ?? "texto") as never,
        timestamp: new Date(message.timestamp * 1000),
      });
    });

    this.client.on("message_ack", (message: Message, ack: number) => {
      const statusMap: Record<number, "enviado" | "entregue" | "lido" | "falhou"> = {
        [-1]: "falhou",
        0: "enviado",
        1: "enviado",
        2: "entregue",
        3: "lido",
        4: "lido",
      };
      this.emit("ack", { externalMessageId: message.id._serialized, status: statusMap[ack] ?? "enviado" });
    });
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.emit("status", status);
  }

  /** Exponential backoff, capped attempts — never loops forever (spec §6). */
  private scheduleReconnect() {
    if (this.reconnecting || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        this.setStatus({ status: "erro", lastError: "Número máximo de tentativas de reconexão atingido" });
      }
      return;
    }

    this.reconnecting = true;
    this.setStatus({ status: "reconectando" });
    const delay = RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts;

    setTimeout(async () => {
      this.reconnectAttempts += 1;
      this.reconnecting = false;
      try {
        await this.client.initialize();
      } catch (error) {
        this.setStatus({ status: "erro", lastError: (error as Error).message });
        this.scheduleReconnect();
      }
    }, delay);
  }

  async connect(): Promise<void> {
    this.setStatus({ status: "conectando" });
    await this.client.initialize();
  }

  async disconnect(): Promise<void> {
    await this.client.destroy();
    this.setStatus({ status: "desconectado" });
  }

  async clearSession(): Promise<void> {
    await this.disconnect().catch(() => undefined);
    rmSync(this.sessionPath, { recursive: true, force: true });
    this.setStatus({ status: "desconectado" });
  }

  async sendMessage(recipient: string, message: string): Promise<void> {
    // Simple client-side rate limit — spread outbound sends to avoid triggering WhatsApp's abuse detection (spec §6).
    const elapsed = Date.now() - this.lastSentAt;
    if (elapsed < this.minSendIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minSendIntervalMs - elapsed));
    }
    const chatId = recipient.includes("@") ? recipient : `${recipient.replace(/\D/g, "")}@c.us`;
    await this.client.sendMessage(chatId, message);
    this.lastSentAt = Date.now();
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return this.status;
  }
}
