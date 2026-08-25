import pkg from "whatsapp-web.js";
import type { Client as WWebClient, Message, Contact } from "whatsapp-web.js";
const { Client, LocalAuth, MessageMedia } = pkg;
import QRCode from "qrcode";
import { rmSync } from "node:fs";
import { createId } from "@nexodesk/shared";
import { BaseMessagingProvider, type ConnectionStatus, type IncomingMessageEvent, type SendResult, type SendMediaInput } from "./messaging-provider.js";
import { translateWhatsappSendError } from "./send-error.js";

/**
 * whatsapp-web.js's injected page script builds the returned Message object by reading
 * WhatsApp Web's own internal state right after the send call — when WA Web's frontend
 * bundle shifts (it updates server-side outside our control), that lookup can throw
 * ("Cannot read properties of undefined (reading 'id')") even though the message was
 * already handed off and genuinely delivered (WhatsApp itself shows it sent, with
 * delivery ticks). Treating this specific failure as an error lost the message from our
 * own chat entirely, even though it went out. A real "not sent" failure (not registered,
 * not connected, actual network/protocol error) always throws a different, recognizable
 * message, so this narrow match is safe.
 */
function isPostSendSerializationGlitch(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Cannot read propert.*of undefined/i.test(message);
}

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
      const event = await this.buildIncomingEvent(message);
      if (event) this.emit("message", event);
    });

    // "message_create" fires for every message (including our own) from the same
    // underlying WhatsApp Web hook as "message" — a rare but observed WhatsApp Web
    // version quirk fires one event but not the other for a given message. Listening
    // to both is a harmless safety net: buildIncomingEvent() already filters out
    // fromMe, and appendMessage() downstream is idempotent on externalId, so a message
    // caught by both listeners is deduplicated automatically instead of doubling up.
    this.client.on("message_create", async (message: Message) => {
      const event = await this.buildIncomingEvent(message);
      if (event) this.emit("message", event);
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

  /**
   * Groups (@g.us), broadcast lists (@broadcast) and status updates are out of scope
   * for a 1:1 sales/support inbox — without this filter, a group's JID gets misread as
   * a "phone number" and pollutes the contact list with garbage entries.
   */
  private async buildIncomingEvent(message: Message): Promise<IncomingMessageEvent | undefined> {
    if (message.isStatus || message.fromMe) return undefined;
    if (message.from.endsWith("@g.us") || message.from.endsWith("@broadcast")) return undefined;

    const contact = await message.getContact().catch(() => undefined);
    const media = message.hasMedia ? await this.downloadMediaWithRetry(message) : undefined;
    const mediaFailedToLoad = message.hasMedia && !media;

    // `message.id._serialized` occasionally comes back empty for messages that arrive
    // while the session is resyncing after a brief reconnect (a known instability of
    // this integration — see connect()'s comments) — appendMessage() requires a
    // non-null externalId, so an empty native id used to crash the whole handler and
    // the message was lost entirely instead of just missing its real WhatsApp id. A
    // deterministic fallback (same chat + timestamp + body always produce the same
    // key) keeps the message from being dropped while still deduplicating retries of
    // the exact same event.
    const externalMessageId = message.id?._serialized || `local:${message.from}:${message.timestamp}:${(message.body ?? "").slice(0, 60)}`;

    return {
      externalMessageId,
      externalChatId: message.from,
      fromPhone: resolveFromPhone(message.from, contact),
      fromName: contact?.pushname ?? contact?.name,
      avatarUrl: await contact?.getProfilePicUrl().catch(() => undefined),
      // A media message with no caption has body === "" (not null) — falling through to
      // "[imagem]" only when the *download* itself failed (mediaFailedToLoad) keeps a
      // normal captionless photo silent while still telling the user something arrived
      // when we genuinely couldn't fetch it, instead of a bubble with nothing in it.
      body: mediaFailedToLoad ? "[Não foi possível baixar esta mídia — peça para o cliente reenviar]" : message.body,
      media: media ? { base64: media.data, mimeType: media.mimetype, fileName: media.filename ?? undefined } : undefined,
      type: (WHATSAPP_MESSAGE_TYPE_MAP[message.type] ?? "texto") as IncomingMessageEvent["type"],
      timestamp: new Date(message.timestamp * 1000),
    };
  }

  /**
   * Incoming media is frequently not yet downloadable the instant the "message" event
   * fires — WhatsApp Web hasn't finished fetching/decrypting the blob from its CDN yet
   * — so a single downloadMedia() call failing is normal and not evidence the media is
   * actually unavailable. A few retries with a short delay resolve the vast majority of
   * these; only a message that still fails after that gets treated as truly undownloadable.
   */
  private async downloadMediaWithRetry(message: Message, attempts = 3, delayMs = 1500) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const media = await message.downloadMedia().catch((error) => {
        console.warn(`[whatsapp] downloadMedia falhou (tentativa ${attempt}/${attempts}):`, (error as Error).message);
        return undefined;
      });
      if (media) return media;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return undefined;
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

    if (recipient.includes("@")) return recipient;

    // Sending straight to a hand-built "<digits>@c.us" id without resolving it first
    // is what throws WhatsApp Web's internal "No LID for user" error — it happens even
    // for a genuinely registered number the first time this session talks to it,
    // because that JID's LID mapping hasn't been cached locally yet. getNumberId()
    // forces WhatsApp to resolve (and cache) it up front, and also lets us tell a truly
    // unregistered number apart from this transient first-contact case.
    //
    // getNumberId is documented to resolve to null for a number that isn't on
    // WhatsApp, but on some WhatsApp Web versions it throws instead ("Cannot read
    // properties of undefined (reading 'id')") — both outcomes mean the same thing
    // here, so a thrown error is treated identically to a null result.
    const numberId = await this.client.getNumberId(recipient.replace(/\D/g, "")).catch(() => null);
    if (!numberId) {
      throw new Error("Este número não está registrado no WhatsApp.");
    }
    return numberId._serialized;
  }

  /** Fail fast with a clear message instead of letting Puppeteer/WWebJS crash deep inside a not-ready page. */
  private assertConnected() {
    if (this.status.status !== "conectado") {
      throw new Error("O WhatsApp não está conectado. Conecte em Configurações → Integrações antes de enviar mensagens.");
    }
  }

  async sendMessage(recipient: string, message: string): Promise<SendResult> {
    this.assertConnected();
    await this.throttle();
    const chatId = await this.resolveChatId(recipient);
    try {
      const sent = await this.client.sendMessage(chatId, message);
      this.lastSentAt = Date.now();
      return { externalId: sent.id._serialized };
    } catch (error) {
      if (!isPostSendSerializationGlitch(error)) throw error;
      this.lastSentAt = Date.now();
      return { externalId: `local:${createId()}` };
    }
  }

  async sendMedia(recipient: string, media: SendMediaInput): Promise<SendResult> {
    this.assertConnected();
    await this.throttle();
    const chatId = await this.resolveChatId(recipient);
    const messageMedia = new MessageMedia(media.mimeType, media.base64, media.fileName);
    try {
      const sent = await this.client.sendMessage(chatId, messageMedia, { caption: media.caption });
      this.lastSentAt = Date.now();
      return { externalId: sent.id._serialized };
    } catch (error) {
      if (!isPostSendSerializationGlitch(error)) throw error;
      this.lastSentAt = Date.now();
      return { externalId: `local:${createId()}` };
    }
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return this.status;
  }
}
