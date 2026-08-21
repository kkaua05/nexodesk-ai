import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { UserRole } from "@nexodesk/shared";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl: string | null;
  lastLoginAt: string | null;
}

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => api.get<User[]>("/users") });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string; role: UserRole }) => api.post<User>("/users", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
