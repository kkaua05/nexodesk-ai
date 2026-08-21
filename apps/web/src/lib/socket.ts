import { io, type Socket } from "socket.io-client";
import { useEffect } from "react";
import type { SocketEventName } from "@nexodesk/shared";
import { useAuthStore } from "@/stores/auth-store";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: "/socket.io", autoConnect: true, transports: ["websocket", "polling"] });
  }
  return socket;
}

/** Subscribe to a typed realtime event for the lifetime of the component (spec §8). */
export function useSocketEvent<T = unknown>(event: SocketEventName, handler: (payload: T) => void) {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    const socketInstance = getSocket();
    socketInstance.on(event, handler);
    return () => {
      socketInstance.off(event, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, token]);
}
