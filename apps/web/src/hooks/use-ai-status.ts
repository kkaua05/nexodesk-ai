import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useAiSettingsProbe() {
  return useQuery({ queryKey: ["ai-status-probe"], queryFn: () => api.get<{ available: boolean; model: string }>("/ai/status") });
}
