import { EventEmitter } from "node:events";
import type { WhatsappConnectionStatus } from "@nexodesk/shared";

export interface ConnectionStatus {
  status: WhatsappConnectionStatus;
  phoneNumber?: string;
  connectedSince?: Date;
  deviceInfo?: string;
  lastError?: string;
}

export interface IncomingMedia {
  base64: string;
  mimeType: string;
  fileName?: string;
}

export interface IncomingMessageEvent {
  externalMessageId: string;
  externalChatId: string;
  fromPhone: string;
  fromName?: string;
  avatarUrl?: string;
  body?: string;
  media?: IncomingMedia;
  type: "texto" | "imagem" | "audio" | "video" | "documento" | "sticker" | "localizacao";
  timestamp: Date;
}

export interface MessageAckEvent {
  externalMessageId: string;
  status: "enviado" | "entregue" | "lido" | "falhou";
  failureReason?: string;
}

export interface SendResult {
  externalId: string;
}

export interface SendMediaInput {
  base64: string;
  mimeType: string;
  fileName: string;
  caption?: string;
}

/**
 * Abstraction the rest of the app depends on (spec §5) — CRM/business logic never
 * imports whatsapp-web.js directly. Swapping to WhatsAppCloudProvider later means
 * implementing this interface, nothing else changes.
 */
export interface MessagingProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(recipient: string, message: string): Promise<SendResult>;
  sendMedia(recipient: string, media: SendMediaInput): Promise<SendResult>;
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
  abstract sendMessage(recipient: string, message: string): Promise<SendResult>;
  abstract sendMedia(recipient: string, media: SendMediaInput): Promise<SendResult>;
  abstract getConnectionStatus(): Promise<ConnectionStatus>;
  abstract clearSession(): Promise<void>;
}
