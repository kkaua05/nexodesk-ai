import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AgendaEntry } from "@/pages/agenda/types";

export interface DashboardSummary {
  newLeadsLast7Days: number;
  conversationsAwaiting: number;
  openProposals: number;
  pipelineValueCents: number;
  activeProjects: number;
  financial: {
    faturamentoCents: number;
    recebidoCents: number;
    aReceberCents: number;
    vencidoCents: number;
    despesasCents: number;
    lucroCents: number;
  };
}

export function useDashboardSummary() {
  return useQuery({ queryKey: ["dashboard-summary"], queryFn: () => api.get<DashboardSummary>("/dashboard/summary") });
}

export function useDashboardToday() {
  return useQuery({ queryKey: ["dashboard-today"], queryFn: () => api.get<AgendaEntry[]>("/dashboard/today") });
}

export function useLeadsByPeriodChart() {
  return useQuery({ queryKey: ["chart-leads-period"], queryFn: () => api.get<{ date: string; count: number }[]>("/dashboard/charts/leads-by-period") });
}

export function useRevenueVsExpensesChart() {
  return useQuery({
    queryKey: ["chart-revenue-expenses"],
    queryFn: () => api.get<{ month: string; revenueCents: number; expensesCents: number }[]>("/dashboard/charts/revenue-vs-expenses"),
  });
}

export function useServicesSoldChart() {
  return useQuery({ queryKey: ["chart-services-sold"], queryFn: () => api.get<{ service: string; count: number }[]>("/dashboard/charts/services-sold") });
}

export function useLeadsByOriginChart() {
  return useQuery({ queryKey: ["chart-leads-origin"], queryFn: () => api.get<{ origin: string; count: number }[]>("/dashboard/charts/leads-by-origin") });
}
