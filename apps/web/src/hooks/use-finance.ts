import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSocketEvent } from "@/lib/socket";

export interface FinancialOverview {
  faturamentoCents: number;
  recebidoCents: number;
  aReceberCents: number;
  vencidoCents: number;
  despesasCents: number;
  lucroCents: number;
}

export interface Receivable {
  id: string;
  customerId: string;
  projectId: string | null;
  description: string;
  amountCents: number;
  paidAmountCents: number;
  dueDate: string;
  status: "pendente" | "pago" | "vencido" | "cancelado" | "parcial";
}

export interface Payable {
  id: string;
  description: string;
  amountCents: number;
  dueDate: string;
  status: "pendente" | "pago" | "vencido" | "cancelado";
}

export function useFinancialOverview() {
  return useQuery({ queryKey: ["finance-overview"], queryFn: () => api.get<FinancialOverview>("/finance/overview") });
}

export function useReceivables() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["receivables"], queryFn: () => api.get<Receivable[]>("/finance/receivables") });
  useSocketEvent("receivable.updated", () => queryClient.invalidateQueries({ queryKey: ["receivables"] }));
  useSocketEvent("payment.created", () => {
    queryClient.invalidateQueries({ queryKey: ["receivables"] });
    queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
  });
  return query;
}

export function usePayables() {
  return useQuery({ queryKey: ["payables"], queryFn: () => api.get<Payable[]>("/finance/payables") });
}

export interface CreateReceivableInput {
  customerId: string;
  projectId?: string;
  categoryId?: string;
  description: string;
  amountCents: number;
  dueDate: string;
}

export function useCreateReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReceivableInput) => api.post<Receivable>("/finance/receivables", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
  });
}

export function useRegisterReceivablePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amountCents, method }: { id: string; amountCents: number; method?: string }) => api.post(`/finance/receivables/${id}/pay`, { amountCents, method }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
  });
}

export function useCreatePayable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { description: string; amountCents: number; dueDate: string; categoryId?: string }) => api.post("/finance/payables", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payables"] }),
  });
}
