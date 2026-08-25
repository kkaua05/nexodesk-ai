import pkg from "whatsapp-web.js";
import type { Client as WWebClient, Message, Contact } from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;
import QRCode from "qrcode";
import { rmSync } from "node:fs";
import { BaseMessagingProvider, type ConnectionStatus, type SendResult, type SendMediaInput } from "./messaging-provider.js";
import { translateWhatsappSendError } from "./send-error.js";

/**
 * WhatsApp addresses some contacts (mostly business/community-linked accounts) by an
 * opaque "LID" instead of their real phone number — `message.from` looks like
 * "123456789@lid" instead of "5551999998888@c.us". `contact.number` sometimes still
 * resolves the real number; when it doesn't (or resolves to the same LID digits), we
 * fall back to the full LID JID so normalizePhone() can tag it as non-phone instead of
 * fabricating a fake "+55..." number out of an internal id.
 */
function resolveFromPhone(from: string, contact: Contact | undefined): string {
  if (!from.endsWith("@lid")) return from.split("@")[0] ?? from;

  const lidDigits = from.replace("@lid", "");
  const candidateNumber = contact?.number?.replace(/\D/g, "");
  if (candidateNumber && candidateNumber !== lidDigits && candidateNumber.length >= 8) {
    return candidateNumber;
  }
  return from; // keeps the "@lid" suffix so normalizePhone() recognizes it
}

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
      // Groups (@g.us), broadcast lists (@broadcast) and status updates are out of
      // scope for a 1:1 sales/support inbox — without this filter, a group's JID gets
      // misread as a "phone number" and pollutes the contact list with garbage entries.
      if (message.isStatus || message.fromMe) return;
      if (message.from.endsWith("@g.us") || message.from.endsWith("@broadcast")) return;

      const contact = await message.getContact().catch(() => undefined);
      const media = message.hasMedia ? await message.downloadMedia().catch(() => undefined) : undefined;

      this.emit("message", {
        externalMessageId: message.id._serialized,
        externalChatId: message.from,
        fromPhone: resolveFromPhone(message.from, contact),
        fromName: contact?.pushname ?? contact?.name,
        avatarUrl: await contact?.getProfilePicUrl().catch(() => undefined),
        body: message.body,
        media: media ? { base64: media.data, mimeType: media.mimetype, fileName: media.filename ?? undefined } : undefined,
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
    // Puppeteer's LocalAuth profile dir can only be opened by one browser at a time —
    // calling client.initialize() again while a connection is already in flight (e.g.
    // the boot-time auto-reconnect racing a manual "Conectar" click) throws "The
    // browser is already running for <dir>" and leaves the client in a broken state.
    // Re-entrant calls while already connecting/connected are just a no-op instead.
    if (["conectando", "conectado", "reconectando", "qr_necessario"].includes(this.status.status)) {
      return;
    }

    this.setStatus({ status: "conectando" });
    try {
      await this.client.initialize();
    } catch (error) {
      this.setStatus({ status: "erro", lastError: translateWhatsappSendError(error) });
      throw error;
    }
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

  private async throttle() {
    // Simple client-side rate limit — spread outbound sends to avoid triggering WhatsApp's abuse detection (spec §6).
    const elapsed = Date.now() - this.lastSentAt;
    if (elapsed < this.minSendIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minSendIntervalMs - elapsed));
    }
  }

  /**
   * `client.sendMessage()` can't target a raw "@lid" chat id directly — WhatsApp Web's
   * own internal code throws trying to resolve it ("Cannot read properties of
   * undefined (reading 'id')"). `getContactLidAndPhone` resolves the LID to the
   * contact's real phone JID, which sendMessage does accept.
   */
  private async resolveChatId(recipient: string): Promise<string> {
    if (recipient.startsWith("lid:")) {
      const lidJid = `${recipient.slice(4)}@lid`;
      const [resolved] = await this.client.getContactLidAndPhone([lidJid]).catch(() => [undefined]);
      if (resolved?.pn) return resolved.pn;
      throw new Error("Não foi possível encontrar o número de telefone deste contato para enviar a mensagem.");
    }
    return recipient.includes("@") ? recipient : `${recipient.replace(/\D/g, "")}@c.us`;
  }

  async sendMessage(recipient: string, message: string): Promise<SendResult> {
    await this.throttle();
    const chatId = await this.resolveChatId(recipient);
    const sent = await this.client.sendMessage(chatId, message);
    this.lastSentAt = Date.now();
    return { externalId: sent.id._serialized };
  }

  async sendMedia(recipient: string, media: SendMediaInput): Promise<SendResult> {
    await this.throttle();
    const chatId = await this.resolveChatId(recipient);
    const messageMedia = new MessageMedia(media.mimeType, media.base64, media.fileName);
    const sent = await this.client.sendMessage(chatId, messageMedia, { caption: media.caption });
    this.lastSentAt = Date.now();
    return { externalId: sent.id._serialized };
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return this.status;
  }
}
