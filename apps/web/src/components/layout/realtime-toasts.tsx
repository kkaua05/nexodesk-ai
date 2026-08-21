import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { MessageCircle, WifiOff } from "lucide-react";
import { useSocketEvent } from "@/lib/socket";
import type { Message } from "@/hooks/use-conversations";

interface WhatsappStatusChangedPayload {
  status: string;
  lastError?: string;
}

/**
 * Global realtime feedback (spec §8/§49): a new inbound WhatsApp message or a lost
 * connection should surface immediately, wherever the user currently is — not only
 * inside the Inbox page. Mounted once at the app shell.
 */
export function RealtimeToasts() {
  const location = useLocation();

  useSocketEvent<{ message: Message; conversationId: string }>("message.received", (payload) => {
    if (payload.message.direction !== "inbound") return;
    // Already looking at the inbox — the conversation list/thread updates live, a toast would be noise.
    if (location.pathname.startsWith("/whatsapp")) return;
    toast.info(payload.message.body ?? "Nova mensagem recebida", {
      icon: <MessageCircle className="h-4 w-4" />,
      description: "Nova mensagem no WhatsApp",
    });
  });

  useSocketEvent<WhatsappStatusChangedPayload>("whatsapp.status_changed", (payload) => {
    if (payload.status === "desconectado" || payload.status === "erro") {
      toast.warning("WhatsApp desconectado", {
        icon: <WifiOff className="h-4 w-4" />,
        description: payload.lastError ?? "Reconecte em Configurações → Integrações.",
      });
    }
  });

  return null;
}
