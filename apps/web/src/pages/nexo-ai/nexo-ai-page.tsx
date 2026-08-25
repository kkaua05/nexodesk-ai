import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, RotateCcw, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCents, formatDate } from "@/lib/format";
import { api, ApiError } from "@/lib/api-client";
import { useMutation } from "@tanstack/react-query";
import { useAiSettingsProbe } from "@/hooks/use-ai-status";

interface NexoAnswer {
  tool: string;
  question: string;
  summary: string;
  items: Record<string, unknown>[];
}

interface HistoryEntry {
  id: string;
  question: string;
  answer?: NexoAnswer;
  error?: string;
}

const SUGGESTIONS = [
  "Quais leads precisam de follow-up?",
  "Quanto tenho a receber este mês?",
  "Quem pediu orçamento de landing page?",
  "Quais clientes estão com pagamento atrasado?",
  "Quem são meus melhores leads?",
];

const TOOL_LABEL: Record<string, string> = {
  leads_needing_followup: "Follow-up",
  receivables_this_month: "Financeiro",
  leads_by_service: "Leads",
  overdue_customers: "Financeiro",
  top_leads: "Leads",
};

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  pago: "success",
  vencido: "destructive",
  atrasado: "destructive",
  pendente: "secondary",
  parcial: "warning",
  cancelado: "secondary",
  novo: "secondary",
  qualificado: "warning",
  ganho: "success",
  perdido: "destructive",
};

const MIN_QUESTION_LENGTH = 3;

function scoreVariant(score: number): "success" | "warning" | "secondary" {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "secondary";
}

/** Renders one AI answer's structured items as readable rows instead of a raw key:value dump. */
function AnswerItem({ item }: { item: Record<string, unknown> }) {
  const title = String(item.name ?? item.customer ?? item.description ?? "Item");
  const rest = Object.entries(item).filter(([k]) => !["id", "name", "customer", "description"].includes(k) && item[k] !== null && item[k] !== undefined);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm">
      <span className="font-medium">{title}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {rest.map(([key, value]) => {
          if (key === "status") {
            const status = String(value);
            return (
              <Badge key={key} variant={STATUS_VARIANT[status] ?? "secondary"}>
                {status}
              </Badge>
            );
          }
          if (key === "score") {
            return (
              <Badge key={key} variant={scoreVariant(Number(value))}>
                score {String(value)}
              </Badge>
            );
          }
          if (key.toLowerCase().includes("cents")) {
            return (
              <Badge key={key} variant="outline">
                {formatCents(Number(value))}
              </Badge>
            );
          }
          if (key.toLowerCase().includes("date") || key.toLowerCase().includes("prazo")) {
            return (
              <span key={key} className="text-xs text-muted-foreground">
                {formatDate(value as string)}
              </span>
            );
          }
          return (
            <span key={key} className="text-xs text-muted-foreground">
              {String(value)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
    </div>
  );
}

export function NexoAiPage() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiStatus = useAiSettingsProbe();

  const ask = useMutation({
    mutationFn: (entry: HistoryEntry) => api.post<NexoAnswer>("/ai/ask", { question: entry.question }),
    onSuccess: (answer, entry) => {
      setHistory((h) => h.map((e) => (e.id === entry.id ? { ...e, answer } : e)));
    },
    onError: (error, entry) => {
      const message = error instanceof ApiError ? error.message : "Não foi possível falar com a IA agora.";
      setHistory((h) => h.map((e) => (e.id === entry.id ? { ...e, error: message } : e)));
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  function handleAsk(raw: string) {
    const trimmed = raw.trim();
    if (trimmed.length < MIN_QUESTION_LENGTH || ask.isPending) return;

    const entry: HistoryEntry = { id: crypto.randomUUID(), question: trimmed };
    setHistory((h) => [...h, entry]);
    setQuestion("");
    inputRef.current?.focus();
    ask.mutate(entry);
  }

  function retry(entry: HistoryEntry) {
    setHistory((h) => h.map((e) => (e.id === entry.id ? { ...e, error: undefined } : e)));
    ask.mutate(entry);
  }

  const aiOnline = aiStatus.data?.available ?? false;
  const canSend = question.trim().length >= MIN_QUESTION_LENGTH && !ask.isPending;

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Nexo AI</h1>
            <p className="text-sm text-muted-foreground">Pergunte sobre leads, clientes e financeiro com dados reais do seu CRM.</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!aiStatus.isLoading && (
            <Badge variant={aiOnline ? "success" : "secondary"} className="gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", aiOnline ? "bg-success" : "bg-muted-foreground")} />
              {aiOnline ? "Online" : "Offline"}
            </Badge>
          )}
          {history.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setHistory([])} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
              Nova conversa
            </Button>
          )}
        </div>
      </div>

      {!aiStatus.isLoading && !aiOnline && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>A IA está offline no momento. Você ainda pode enviar perguntas, mas as respostas podem falhar até ela voltar.</span>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto pb-1">
        {history.length === 0 && (
          <div className="flex flex-col items-center gap-4 pt-8 text-center">
            <p className="text-sm text-muted-foreground">Experimente perguntar:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleAsk(s)}
                  className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((entry) => (
          <div key={entry.id} className="space-y-2">
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">{entry.question}</div>
            </div>

            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </div>

              {!entry.answer && !entry.error && (
                <Card className="max-w-[80%]">
                  <CardContent className="p-3.5">
                    <TypingIndicator />
                  </CardContent>
                </Card>
              )}

              {entry.error && (
                <Card className="max-w-[80%] border-destructive/30 bg-destructive/5">
                  <CardContent className="space-y-2 p-3.5">
                    <p className="flex items-center gap-1.5 text-sm text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {entry.error}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => retry(entry)} disabled={ask.isPending} className="gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Tentar novamente
                    </Button>
                  </CardContent>
                </Card>
              )}

              {entry.answer && (
                <Card className="max-w-[80%]">
                  <CardContent className="space-y-3 p-3.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {TOOL_LABEL[entry.answer.tool] ?? "Resposta"}
                      </Badge>
                    </div>
                    <p className="text-sm">{entry.answer.summary}</p>
                    {entry.answer.items.length > 0 && (
                      <div className="space-y-1.5">
                        {entry.answer.items.slice(0, 8).map((item, j) => (
                          <AnswerItem key={j} item={item} />
                        ))}
                        {entry.answer.items.length > 8 && (
                          <p className="pt-0.5 text-xs text-muted-foreground">+ {entry.answer.items.length - 8} outro(s) resultado(s).</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 space-y-1.5 bg-background pt-1">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk(question)}
            placeholder="Pergunte algo sobre seus leads, clientes ou financeiro..."
            disabled={ask.isPending}
          />
          <Button onClick={() => handleAsk(question)} disabled={!canSend}>
            {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {question.trim().length > 0 && question.trim().length < MIN_QUESTION_LENGTH && (
          <p className="text-xs text-muted-foreground">Escreva pelo menos {MIN_QUESTION_LENGTH} caracteres.</p>
        )}
      </div>
    </div>
  );
}
