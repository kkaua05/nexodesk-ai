import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSocketEvent } from "@/lib/socket";
import type { TaskPriority, TaskStatus } from "@nexodesk/shared";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  customerId: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
}

export function useTasks() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["tasks"], queryFn: () => api.get<Task[]>("/tasks") });
  useSocketEvent("task.created", () => queryClient.invalidateQueries({ queryKey: ["tasks"] }));
  useSocketEvent("task.updated", () => queryClient.invalidateQueries({ queryKey: ["tasks"] }));
  return query;
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; description?: string; projectId?: string; customerId?: string; priority?: TaskPriority; dueDate?: string }) =>
      api.post<Task>("/tasks", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
