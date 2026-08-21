import { useState } from "react";
import { Handshake, CheckSquare, StickyNote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initials, formatCents } from "@/lib/format";
import type { Conversation } from "@/hooks/use-conversations";
import { useLeads } from "@/hooks/use-leads";
import { CloseSaleDialog } from "@/components/sales/close-sale-dialog";
import { useCreateTask } from "@/hooks/use-tasks";
import { toast } from "sonner";

const LEAD_STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  contato: "Contato",
  qualificacao: "Qualificação",
  orcamento: "Orçamento",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

export function ContactPanel({ conversation }: { conversation: Conversation }) {
  const { data: leads } = useLeads();
  const createTask = useCreateTask();
  const [closeSaleOpen, setCloseSaleOpen] = useState(false);

  const lead = leads?.find((l) => l.contactId === conversation.contactId);

  return (
    <div className="w-72 shrink-0 border-l border-border/60 p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <Avatar className="h-16 w-16">
          <AvatarImage src={conversation.contact?.avatarUrl ?? undefined} />
          <AvatarFallback className="text-base">{initials(conversation.contact?.name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{conversation.contact?.name ?? "Sem nome"}</p>
          <p className="text-xs text-muted-foreground">{conversation.contact?.phoneNormalized}</p>
        </div>
      </div>

      {lead ? (
        <div className="mt-5 space-y-3">
          <InfoRow label="Status" value={<Badge>{LEAD_STATUS_LABEL[lead.status] ?? lead.status}</Badge>} />
          <InfoRow label="Lead Score" value={`${lead.score}/100`} />
          <InfoRow label="Serviço" value={lead.service?.name ?? "—"} />
          <InfoRow label="Valor potencial" value={lead.potentialValueCents ? formatCents(lead.potentialValueCents) : "—"} />
        </div>
      ) : (
        <p className="mt-5 text-center text-xs text-muted-foreground">Nenhum lead ativo para este contato.</p>
      )}

      <div className="mt-6 space-y-1.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            if (!lead) return;
            createTask.mutate({ title: `Follow-up com ${conversation.contact?.name ?? "contato"}`, priority: "normal" });
            toast.success("Tarefa criada");
          }}
          disabled={!lead}
        >
          <CheckSquare className="h-4 w-4" />
          Criar tarefa
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start" disabled>
          <StickyNote className="h-4 w-4" />
          Adicionar nota
        </Button>
        <Button size="sm" className="w-full justify-start" disabled={!lead} onClick={() => setCloseSaleOpen(true)}>
          <Handshake className="h-4 w-4" />
          Registrar venda
        </Button>
      </div>

      {lead && <CloseSaleDialog lead={lead} open={closeSaleOpen} onOpenChange={setCloseSaleOpen} />}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
