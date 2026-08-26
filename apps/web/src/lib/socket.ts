import { io, type Socket } from "socket.io-client";
import { useEffect, useRef } from "react";
import type { SocketEventName } from "@nexodesk/shared";
import { useAuthStore } from "@/stores/auth-store";
import { API_BASE_URL } from "@/lib/api-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL || undefined, { path: "/socket.io", autoConnect: true, transports: ["websocket", "polling"] });
  }
  return socket;
}

/**
 * Subscribe to a typed realtime event for the lifetime of the component (spec §8).
 *
 * `handler` is almost always a fresh inline closure every render (e.g. it closes over
 * a conversationId prop) — subscribing directly to it would either (a) resubscribe on
 * every render if `handler` were a dependency, or (b) silently keep calling the very
 * first render's stale closure forever if it weren't, which is what happened before:
 * switching conversations never updated which conversationId the listener compared
 * against, so live updates only ever worked for whichever conversation was open first.
 * Routing calls through a ref keeps one stable subscription while always invoking the
 * latest closure.
 */
export function useSocketEvent<T = unknown>(event: SocketEventName, handler: (payload: T) => void) {
  const token = useAuthStore((s) => s.token);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!token) return;
    const socketInstance = getSocket();
    const listener = (payload: T) => handlerRef.current(payload);
    socketInstance.on(event, listener);
    return () => {
      socketInstance.off(event, listener);
    };
  }, [event, token]);
}
