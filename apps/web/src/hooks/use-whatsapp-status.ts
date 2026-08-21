import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSocketEvent } from "@/lib/socket";
import type { WhatsappConnectionStatus } from "@nexodesk/shared";

export interface WhatsappStatus {
  status: WhatsappConnectionStatus;
  phoneNumber?: string;
  connectedSince?: string;
  deviceInfo?: string;
  lastError?: string;
  qr?: string;
}

export function useWhatsappStatus() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: () => api.get<WhatsappStatus>("/whatsapp/status"),
    refetchInterval: 10_000,
  });

  useSocketEvent("whatsapp.status_changed", () => {
    queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] });
  });
  useSocketEvent("whatsapp.qr", () => {
    queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] });
  });

  return query;
}
