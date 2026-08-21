import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSocketEvent } from "@/lib/socket";

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
  contact?: Contact;
}

export interface Message {
  id: string;
  conversationId: string;
  externalId: string;
  direction: "inbound" | "outbound";
  type: string;
  body: string | null;
  mediaUrl: string | null;
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
