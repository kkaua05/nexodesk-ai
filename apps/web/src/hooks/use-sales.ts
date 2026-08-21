import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface CloseSaleInput {
  leadId: string;
  serviceId: string;
  proposalId?: string;
  totalCents: number;
  downPaymentCents: number;
  installmentCount: number;
  paymentMethod: string;
  deliveryDays: number;
}

export function useCloseSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CloseSaleInput) => api.post("/sales/close", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
