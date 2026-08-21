import { EventEmitter } from "node:events";
import type { WhatsappConnectionStatus } from "@nexodesk/shared";

export interface ConnectionStatus {
  status: WhatsappConnectionStatus;
  phoneNumber?: string;
  connectedSince?: Date;
  deviceInfo?: string;
  lastError?: string;
}

export interface IncomingMessageEvent {
  externalMessageId: string;
  externalChatId: string;
  fromPhone: string;
  fromName?: string;
  avatarUrl?: string;
  body?: string;
  mediaUrl?: string;
  type: "texto" | "imagem" | "audio" | "video" | "documento" | "sticker" | "localizacao";
  timestamp: Date;
}

export interface MessageAckEvent {
  externalMessageId: string;
  status: "enviado" | "entregue" | "lido" | "falhou";
  failureReason?: string;
}

/**
 * Abstraction the rest of the app depends on (spec §5) — CRM/business logic never
 * imports whatsapp-web.js directly. Swapping to WhatsAppCloudProvider later means
 * implementing this interface, nothing else changes.
 */
export interface MessagingProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(recipient: string, message: string): Promise<void>;
  getConnectionStatus(): Promise<ConnectionStatus>;
  clearSession(): Promise<void>;

  on(event: "message", listener: (payload: IncomingMessageEvent) => void): this;
  on(event: "ack", listener: (payload: MessageAckEvent) => void): this;
  on(event: "qr", listener: (qrDataUrl: string) => void): this;
  on(event: "status", listener: (status: ConnectionStatus) => void): this;
}

export abstract class BaseMessagingProvider extends EventEmitter implements MessagingProvider {
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract sendMessage(recipient: string, message: string): Promise<void>;
  abstract getConnectionStatus(): Promise<ConnectionStatus>;
  abstract clearSession(): Promise<void>;
}
