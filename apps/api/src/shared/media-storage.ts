import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { createId } from "@nexodesk/shared";
import { env } from "./env.js";

const MEDIA_ROOT = path.resolve(env.UPLOAD_ROOT, "whatsapp");

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
};

/**
 * Persists WhatsApp media (inbound or outbound) to disk instead of inline base64 in
 * the database — keeps `messages` rows small and lets the frontend request files on
 * demand instead of shipping every photo/video with every conversation fetch.
 * Returns the path stored on `messages.mediaUrl`, relative to MEDIA_ROOT.
 */
export function saveMediaBase64(base64: string, mimeType: string, fileName?: string): string {
  mkdirSync(MEDIA_ROOT, { recursive: true });
  const ext = fileName?.split(".").pop() ?? EXTENSION_BY_MIME[mimeType] ?? "bin";
  const safeName = `${createId()}.${ext}`;
  writeFileSync(path.join(MEDIA_ROOT, safeName), Buffer.from(base64, "base64"));
  return safeName;
}

export function readMedia(relativePath: string): Buffer {
  return readFileSync(path.join(MEDIA_ROOT, path.basename(relativePath)));
}

export function mediaFilePath(relativePath: string): string {
  return path.join(MEDIA_ROOT, path.basename(relativePath));
}
