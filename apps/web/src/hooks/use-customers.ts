import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Contact } from "@/hooks/use-conversations";

export interface CustomerFinancial {
  totalContractedCents: number;
  receivedCents: number;
  pendingCents: number;
}

export interface Customer {
  id: string;
  contactId: string;
  name: string;
  email: string | null;
  company: string | null;
  segment: string | null;
  customerSince: string;
  contact?: Contact;
  financial: CustomerFinancial;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string | null;
  valueCents: number | null;
  occurredAt: string;
}

export function useCustomers() {
  return useQuery({ queryKey: ["customers"], queryFn: () => api.get<Customer[]>("/customers") });
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  document?: string;
  address?: string;
  notes?: string;
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerInput) => api.post<Customer>("/customers", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({ queryKey: ["customer", id], queryFn: () => api.get<Customer>(`/customers/${id}`), enabled: !!id });
}

export function useCustomerTimeline(id: string | undefined) {
  return useQuery({ queryKey: ["customer-timeline", id], queryFn: () => api.get<TimelineEvent[]>(`/customers/${id}/timeline`), enabled: !!id });
}

export interface CustomerProject {
  id: string;
  name: string;
  status: string;
  progress: number;
  valueCents: number | null;
}

export function useCustomerProjects(id: string | undefined) {
  return useQuery({ queryKey: ["customer-projects", id], queryFn: () => api.get<CustomerProject[]>(`/customers/${id}/projects`), enabled: !!id });
}

export interface CustomerProposal {
  id: string;
  number: string;
  status: string;
  totalCents: number;
}

export function useCustomerProposals(id: string | undefined) {
  return useQuery({ queryKey: ["customer-proposals", id], queryFn: () => api.get<CustomerProposal[]>(`/customers/${id}/proposals`), enabled: !!id });
}

export interface CustomerReceivable {
  id: string;
  description: string;
  amountCents: number;
  paidAmountCents: number;
  dueDate: string;
  status: string;
}

export function useCustomerReceivables(id: string | undefined) {
  return useQuery({ queryKey: ["customer-receivables", id], queryFn: () => api.get<CustomerReceivable[]>(`/customers/${id}/receivables`), enabled: !!id });
}
