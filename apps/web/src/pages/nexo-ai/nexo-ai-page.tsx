import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { useMutation } from "@tanstack/react-query";

interface NexoAnswer {
  tool: string;
  question: string;
  summary: string;
  items: Record<string, unknown>[];
}

const SUGGESTIONS = [
  "Quais leads precisam de follow-up?",
  "Quanto tenho a receber este mês?",
  "Quem pediu orçamento de landing page?",
  "Quais clientes estão com pagamento atrasado?",
  "Quem são meus melhores leads?",
];

export function NexoAiPage() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<NexoAnswer[]>([]);

  const ask = useMutation({
    mutationFn: (q: string) => api.post<NexoAnswer>("/ai/ask", { question: q }),
    onSuccess: (answer) => setHistory((h) => [answer, ...h]),
  });

  function handleAsk(q: string) {
    if (!q.trim()) return;
    ask.mutate(q.trim());
    setQuestion("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Nexo AI</h1>
        <p className="text-sm text-muted-foreground">Pergunte sobre seus leads, clientes e financeiro usando dados reais do seu CRM.</p>
      </div>

      <div className="flex gap-2">
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAsk(question)} placeholder="Pergunte algo..." />
        <Button onClick={() => handleAsk(question)} disabled={ask.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {history.length === 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => handleAsk(s)} className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {history.map((answer, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">{answer.question}</p>
              <p className="mt-1 text-sm">{answer.summary}</p>
              {answer.items.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {answer.items.slice(0, 8).map((item, j) => (
                    <div key={j} className="rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
                      {Object.entries(item)
                        .filter(([k]) => k !== "id")
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(" · ")}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
