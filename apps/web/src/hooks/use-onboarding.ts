import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useOnboardingStatus() {
  return useQuery({ queryKey: ["onboarding-status"], queryFn: () => api.get<{ completed: boolean }>("/onboarding/status") });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/onboarding/complete"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding-status"] }),
  });
}
