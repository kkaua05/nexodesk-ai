import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, API_BASE_URL } from "@/lib/api-client";
import { useSocketEvent } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";

export interface Contact {
  id: string;
  name: string | null;
  phoneNormalized: string;
  avatarUrl: string | null;
}

export interface Conversation {
  id: string;
  contactId: string;
  status: "aguardando_resposta" | "em_atendimento" | "follow_up" | "arquivada";
  unreadCount: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  /** Nexo AI auto-reply for this conversation — turns off automatically once an attendant sends a message here. */
  aiEnabled: boolean;
  contact?: Contact;
  /** Only present right after POST /conversations, if the optional first message failed to send. */
  messageError?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  externalId: string;
  direction: "inbound" | "outbound";
  type: string;
  body: string | null;
  mediaUrl: string | null;
  mediaFileName: string | null;
  status: "enviando" | "enviado" | "entregue" | "lido" | "falhou";
  createdAt: string;
}

export function useConversations() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["conversations"], queryFn: () => api.get<Conversation[]>("/conversations") });

  useSocketEvent("conversation.updated", () => queryClient.invalidateQueries({ queryKey: ["conversations"] }));
  useSocketEvent("contact.created", () => queryClient.invalidateQueries({ queryKey: ["conversations"] }));
  useSocketEvent("message.received", () => queryClient.invalidateQueries({ queryKey: ["conversations"] }));

  return query;
}

export function useMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => api.get<Message[]>(`/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  });

  useSocketEvent<{ message: Message }>("message.received", (payload) => {
    if (payload.message.conversationId === conversationId) {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    }
  });
  useSocketEvent<{ message: Message }>("message.updated", (payload) => {
    if (payload.message.conversationId === conversationId) {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    }
  });

  return query;
}

export function useSendMessage(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.post<Message>(`/conversations/${conversationId}/messages`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useToggleConversationAi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, enabled }: { conversationId: string; enabled: boolean }) =>
      api.patch<Conversation>(`/conversations/${conversationId}/ai-enabled`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => api.post(`/conversations/${conversationId}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useAiSuggestion(conversationId: string | undefined) {
  return useMutation({
    mutationFn: () => api.get<{ reply: string | null }>(`/conversations/${conversationId}/ai-suggestion`),
  });
}

export function useSendMedia(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption?: string }) => {
      const token = useAuthStore.getState().token;
      const formData = new FormData();
      formData.append("file", file);
      if (caption) formData.append("caption", caption);

      const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/media`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new ApiError(body?.error?.code ?? "UPLOAD_FAILED", body?.error?.message ?? "Falha ao enviar arquivo", response.status);
      }
      return response.json() as Promise<Message>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function mediaUrl(messageId: string) {
  return `${API_BASE_URL}/api/conversations/messages/${messageId}/media`;
}

export interface StartConversationInput {
  phone: string;
  name?: string;
  message?: string;
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StartConversationInput) => api.post<Conversation>("/conversations", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}
