import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "node:http";
import type { SocketEventName } from "@nexodesk/shared";
import { isAllowedOrigin } from "./cors.js";

let io: SocketIOServer | undefined;

export function initRealtime(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      credentials: true,
    },
  });
  return io;
}

/**
 * Typed emit — the whole app must go through this so event payloads stay well-defined
 * and nobody reaches for a generic "update"/"data" event (spec §8).
 */
export function emitEvent<T extends Record<string, unknown>>(event: SocketEventName, payload: T) {
  if (!io) return;
  io.emit(event, payload);
}

export function getIO() {
  return io;
}
