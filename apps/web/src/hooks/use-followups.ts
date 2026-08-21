import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSocketEvent } from "@/lib/socket";

export interface FollowUp {
  id: string;
  reason: string;
  leadId?: string | null;
  customerId?: string | null;
  proposalId?: string | null;
  note?: string | null;
  dueAt: string;
  resolvedAt?: string | null;
}

export function useFollowUps() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["followups"], queryFn: () => api.get<FollowUp[]>("/followups") });

  useSocketEvent("followup.created", () => {
    queryClient.invalidateQueries({ queryKey: ["followups"] });
  });

  return query;
}

export function useResolveFollowUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/followups/${id}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["followups"] }),
  });
}
