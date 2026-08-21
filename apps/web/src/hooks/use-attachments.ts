import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export interface Attachment {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export function useAttachments(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ["attachments", entityType, entityId],
    queryFn: () => api.get<Attachment[]>(`/attachments?entityType=${entityType}&entityId=${entityId}`),
    enabled: !!entityId,
  });
}

async function uploadFile(entityType: string, entityId: string, file: File) {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  formData.append("entityType", entityType);
  formData.append("entityId", entityId);
  formData.append("file", file);

  const response = await fetch("/api/attachments", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error?.code ?? "UPLOAD_FAILED", body?.error?.message ?? "Falha ao enviar arquivo", response.status);
  }
  return response.json() as Promise<Attachment>;
}

export function useUploadAttachment(entityType: string, entityId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadFile(entityType, entityId as string, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attachments", entityType, entityId] }),
  });
}

export function useDeleteAttachment(entityType: string, entityId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/attachments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attachments", entityType, entityId] }),
  });
}

export function attachmentDownloadUrl(id: string) {
  return `/api/attachments/${id}/download`;
}
