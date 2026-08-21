import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Note {
  id: string;
  entityType: string;
  entityId: string;
  authorUserId: string | null;
  body: string;
  createdAt: string;
}

export function useNotes(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ["notes", entityType, entityId],
    queryFn: () => api.get<Note[]>(`/notes?entityType=${entityType}&entityId=${entityId}`),
    enabled: !!entityId,
  });
}

export function useCreateNote(entityType: string, entityId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.post<Note>("/notes", { entityType, entityId, body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes", entityType, entityId] }),
  });
}

export function useDeleteNote(entityType: string, entityId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes", entityType, entityId] }),
  });
}
