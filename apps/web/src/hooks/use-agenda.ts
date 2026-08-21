import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AgendaEntry } from "@/pages/agenda/types";

export function useAgenda(from: Date, to: Date) {
  return useQuery({
    queryKey: ["agenda", from.toISOString(), to.toISOString()],
    queryFn: () => api.get<AgendaEntry[]>(`/calendar?from=${from.toISOString()}&to=${to.toISOString()}`),
  });
}
