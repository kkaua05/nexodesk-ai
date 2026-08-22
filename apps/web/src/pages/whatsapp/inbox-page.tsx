import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Sparkles, Search, CircleCheck, CircleX, Clock, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatRelative, formatDate, formatTime, initials, formatPhoneOrIdentifier } from "@/lib/format";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useSendMedia,
  useMarkConversationRead,
  useAiSuggestion,
  type Conversation,
  type Message,
} from "@/hooks/use-conversations";
import { ContactPanel } from "@/pages/whatsapp/contact-panel";
import { NewConversationDialog } from "@/pages/whatsapp/new-conversation-dialog";
import { MediaMessage } from "@/components/whatsapp/media-message";
import { ApiError } from "@/lib/api-client";

const FILTERS = [
  { key: "todas", label: "Todas" },
  { key: "nao_lidas", label: "Não lidas" },
  { key: "aguardando_resposta", label: "Aguardando" },
  { key: "em_atendimento", label: "Em atendimento" },
  { key: "follow_up", label: "Follow-up" },
] as const;

export function WhatsappInboxPage() {
  const { data: conversations, isLoading } = useConversations();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("todas");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!conversations) return [];
    return conversations
      .filter((c) => {
        if (filter === "nao_lidas") return c.unreadCount > 0;
        if (filter !== "todas") return c.status === filter;
        return true;
      })
      .filter((c) => {
        const term = search.toLowerCase();
        if (!term) return true;
        return (c.contact?.name?.toLowerCase().includes(term) ?? false) || (c.contact?.phoneNormalized.includes(term) ?? false);
      });
  }, [conversations, filter, search]);

  const selected = conversations?.find((c) => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border/60 bg-card shadow-card">
      <div className="flex w-80 shrink-0 flex-col border-r border-border/60">
        <div className="space-y-2 border-b border-border/60 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar conversa..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-colors", filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70")}
              >
                {f.label}
              </button>
            ))}
          </div>
          <NewConversationDialog onCreated={setSelectedId} />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Carregando conversas...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhuma conversa encontrada. Quando uma nova pessoa entrar em contato pelo WhatsApp, ela aparecerá aqui.
            </p>
          )}
          {filtered.map((conversation) => (
            <ConversationListItem key={conversation.id} conversation={conversation} active={conversation.id === selectedId} onClick={() => setSelectedId(conversation.id)} />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <ChatPanel conversation={selected} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Selecione uma conversa para começar</div>
        )}
      </div>

      {selected && <ContactPanel conversation={selected} />}
    </div>
  );
}

function ConversationListItem({ conversation, active, onClick }: { conversation: Conversation; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex w-full items-start gap-3 border-b border-border/40 px-3 py-3 text-left transition-colors hover:bg-muted/50", active && "bg-primary/5")}
    >
      <Avatar>
        <AvatarImage src={conversation.contact?.avatarUrl ?? undefined} />
        <AvatarFallback>{initials(conversation.contact?.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{conversation.contact?.name ?? conversation.contact?.phoneNormalized ?? "Contato"}</p>
          {conversation.lastMessageAt && <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(conversation.lastMessageAt)}</span>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{conversation.lastMessagePreview ?? "Sem mensagens"}</p>
          {conversation.unreadCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ChatPanel({ conversation }: { conversation: Conversation }) {
  const { data: messages } = useMessages(conversation.id);
  const sendMessage = useSendMessage(conversation.id);
  const sendMedia = useSendMedia(conversation.id);
  const markRead = useMarkConversationRead();
  const suggestion = useAiSuggestion(conversation.id);
  const [draft, setDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useMemo(() => {
    if (conversation.unreadCount > 0) markRead.mutate(conversation.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  async function handleSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    try {
      await sendMessage.mutateAsync(text);
    } catch (error) {
      setDraft(text); // give the message back so nothing typed is lost
      toast.error(error instanceof ApiError ? error.message : "Não foi possível enviar a mensagem");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await sendMedia.mutateAsync({ file });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível enviar o arquivo");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  let lastDate = "";

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <Avatar>
          <AvatarImage src={conversation.contact?.avatarUrl ?? undefined} />
          <AvatarFallback>{initials(conversation.contact?.name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold">{conversation.contact?.name ?? formatPhoneOrIdentifier(conversation.contact?.phoneNormalized)}</p>
          <p className="text-xs text-muted-foreground">{formatPhoneOrIdentifier(conversation.contact?.phoneNormalized)}</p>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        {(messages ?? []).map((message) => {
          const dateLabel = formatDate(message.createdAt);
          const showDateSeparator = dateLabel !== lastDate;
          lastDate = dateLabel;
          return (
            <div key={message.id}>
              {showDateSeparator && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">{dateLabel}</span>
                </div>
              )}
              <div className={cn("flex", message.direction === "outbound" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    message.direction === "outbound" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  <MessageContent message={message} />
                  <div className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", message.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {formatTime(message.createdAt)}
                    {message.direction === "outbound" && <MessageStatusIcon status={message.status} />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {(!messages || messages.length === 0) && <p className="text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>}
      </div>

      <div className="border-t border-border/60 p-3">
        {suggestion.data?.reply && (
          <button
            onClick={() => setDraft(suggestion.data!.reply!)}
            className="mb-2 flex w-full items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2 text-left text-xs text-foreground/80 hover:bg-primary/10"
          >
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            {suggestion.data.reply}
          </button>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={sendMedia.isPending} title="Enviar arquivo">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escreva uma mensagem..."
            className="max-h-32 min-h-[40px] flex-1 resize-none"
          />
          <Button variant="outline" size="icon" onClick={() => suggestion.mutate()} title="Sugestão da IA">
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button size="icon" onClick={handleSend} disabled={sendMessage.isPending || !draft.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

function MessageContent({ message }: { message: Message }) {
  if (message.mediaUrl) {
    return (
      <div className="space-y-1">
        <MediaMessage messageId={message.id} type={message.type} fileName={message.mediaFileName ?? undefined} outbound={message.direction === "outbound"} />
        {message.body && message.type !== "documento" && <p>{message.body}</p>}
      </div>
    );
  }
  return <>{message.body ?? `[${message.type}]`}</>;
}

function MessageStatusIcon({ status }: { status: string }) {
  if (status === "falhou") return <CircleX className="h-3 w-3 text-destructive" />;
  if (status === "enviando") return <Clock className="h-3 w-3" />;
  return <CircleCheck className="h-3 w-3" />;
}
