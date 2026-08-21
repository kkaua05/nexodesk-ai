import { env } from "./env.js";

const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * Vite's dev server picks a different port whenever the configured one (5173) is
 * already taken (5174, 5175, ...), and a hardcoded single CORS_ORIGIN silently
 * breaks the Socket.IO handshake the moment that happens — REST calls still work
 * because they go through Vite's same-origin proxy, but the browser opens the
 * WebSocket directly against the API, where the Origin header is checked.
 *
 * In development, accept any localhost/127.0.0.1 origin regardless of port. In
 * production, only the explicitly configured CORS_ORIGIN is allowed.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin / non-browser requests carry no Origin header
  if (env.NODE_ENV !== "production") return LOCALHOST_ORIGIN_PATTERN.test(origin);
  return origin === env.CORS_ORIGIN;
}
