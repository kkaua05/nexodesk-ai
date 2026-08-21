import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSocketEvent } from "@/lib/socket";
import type { LeadStatus } from "@nexodesk/shared";
import type { Contact } from "@/hooks/use-conversations";

export interface Service {
  id: string;
  name: string;
  category: string;
  basePriceCents: number;
  minPriceCents: number;
  averageDeliveryDays: number | null;
  suggestedDownPaymentCents: number | null;
  isActive: boolean;
}

export interface Lead {
  id: string;
  contactId: string;
  serviceId: string | null;
  status: LeadStatus;
  origin: string;
  score: number;
  potentialValueCents: number | null;
  firstMessage: string | null;
  createdAt: string;
  contact?: Contact;
  service?: Service;
}

export function useLeads() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["leads"], queryFn: () => api.get<Lead[]>("/leads") });
  useSocketEvent("lead.created", () => queryClient.invalidateQueries({ queryKey: ["leads"] }));
  useSocketEvent("lead.updated", () => queryClient.invalidateQueries({ queryKey: ["leads"] }));
  return query;
}

export function useLead(id: string | undefined) {
  return useQuery({ queryKey: ["lead", id], queryFn: () => api.get<Lead & { events: unknown[]; memories: { id: string; content: string; kind: string }[]; tags: unknown[] }>(`/leads/${id}`), enabled: !!id });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) => api.patch(`/leads/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useServices() {
  return useQuery({ queryKey: ["services"], queryFn: () => api.get<Service[]>("/services") });
}
