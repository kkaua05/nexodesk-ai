import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSocketEvent } from "@/lib/socket";
import type { ProposalStatus } from "@nexodesk/shared";

export interface Proposal {
  id: string;
  number: string;
  leadId: string | null;
  customerId: string | null;
  serviceId: string | null;
  totalCents: number;
  status: ProposalStatus;
  createdAt: string;
  validUntil: string | null;
}

export function useProposals() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["proposals"], queryFn: () => api.get<Proposal[]>("/proposals") });
  useSocketEvent("proposal.updated", () => queryClient.invalidateQueries({ queryKey: ["proposals"] }));
  return query;
}

export function useUpdateProposalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProposalStatus }) => api.patch(`/proposals/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export interface CreateProposalInput {
  leadId?: string;
  customerId?: string;
  serviceId?: string;
  items: { description: string; quantity: number; unitPriceCents: number }[];
  discountCents?: number;
  downPaymentCents?: number;
  installmentCount?: number;
  deliveryDays?: number;
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProposalInput) => api.post<Proposal>("/proposals", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proposals"] }),
  });
}
