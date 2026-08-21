import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface AutomationRun {
  id: string;
  automationKey: string;
  startedAt: string;
  finishedAt: string | null;
  status: "sucesso" | "erro" | "pulado";
  entityType: string | null;
  error: string | null;
}

export interface Automation {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
}

export function useAutomationSettingsMap() {
  return useQuery({ queryKey: ["automation-settings"], queryFn: () => api.get<Record<string, boolean>>("/settings/automations") });
}

export function useAutomations() {
  return useQuery({ queryKey: ["automations"], queryFn: () => api.get<Automation[]>("/automations") });
}

export function useAutomationRuns() {
  return useQuery({ queryKey: ["automation-runs"], queryFn: () => api.get<AutomationRun[]>("/automations/runs"), refetchInterval: 15_000 });
}

export function useUpdateAutomationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, boolean>) => api.put("/settings/automations", settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      queryClient.invalidateQueries({ queryKey: ["automation-settings"] });
    },
  });
}
