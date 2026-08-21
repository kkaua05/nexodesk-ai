import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSocketEvent } from "@/lib/socket";
import type { ProjectStatus } from "@nexodesk/shared";

export interface Project {
  id: string;
  customerId: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  valueCents: number | null;
  startDate: string | null;
  dueDate: string | null;
}

export interface ProjectStage {
  id: string;
  name: string;
  order: number;
  completedAt: string | null;
}

export interface ProjectDetail extends Project {
  stages: ProjectStage[];
  tasks: { id: string; title: string; status: string; priority: string; dueDate: string | null }[];
}

export function useProjects() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["projects"], queryFn: () => api.get<Project[]>("/projects") });
  useSocketEvent("project.updated", () => queryClient.invalidateQueries({ queryKey: ["projects"] }));
  return query;
}

export function useProject(id: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["project", id], queryFn: () => api.get<ProjectDetail>(`/projects/${id}`), enabled: !!id });
  useSocketEvent("project.updated", () => queryClient.invalidateQueries({ queryKey: ["project", id] }));
  return query;
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) => api.patch(`/projects/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProjectProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, progress }: { id: string; progress: number }) => api.patch(`/projects/${id}/progress`, { progress }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", vars.id] });
    },
  });
}

export function useCompleteProjectStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stageId: string) => api.patch(`/projects/stages/${stageId}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project"] }),
  });
}
