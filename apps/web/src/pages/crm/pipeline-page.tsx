import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LeadScoreBadge } from "@/components/leads/lead-score-badge";
import { formatCents, formatRelative, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePipeline, useMoveOpportunity, type PipelineOpportunity } from "@/hooks/use-pipeline";
import type { PipelineStage } from "@nexodesk/shared";

export function PipelinePage() {
  const { data: columns, isLoading } = usePipeline();
  const moveOpportunity = useMoveOpportunity();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);

  function handleDrop(stageKey: PipelineStage) {
    if (!draggingId) return;
    moveOpportunity.mutate({ id: draggingId, toStage: stageKey, order: 0 });
    setDraggingId(null);
    setDragOverStage(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline de vendas</h1>
        <p className="text-sm text-muted-foreground">Arraste os cards entre as colunas para atualizar o estágio da negociação.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando pipeline...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {columns?.map((column) => {
            const totalValue = column.opportunities.reduce((sum, o) => sum + (o.opportunity.valueCents ?? 0), 0);
            return (
              <div
                key={column.stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(column.stage.key);
                }}
                onDragLeave={() => setDragOverStage((s) => (s === column.stage.key ? null : s))}
                onDrop={() => handleDrop(column.stage.key)}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-xl border border-border/60 bg-muted/30 transition-colors",
                  dragOverStage === column.stage.key && "border-primary/50 bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between rounded-t-xl border-b border-border/60 bg-card px-3 py-2.5">
                  <span className="text-sm font-semibold">{column.stage.label}</span>
                  <span className="text-xs text-muted-foreground">{column.opportunities.length}</span>
                </div>
                <div className="px-3 py-2 text-xs text-muted-foreground">{formatCents(totalValue)}</div>
                <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2 scrollbar-thin">
                  {column.opportunities.map((opp) => (
                    <OpportunityCard key={opp.opportunity.id} opp={opp} dragging={draggingId === opp.opportunity.id} onDragStart={() => setDraggingId(opp.opportunity.id)} onDragEnd={() => setDraggingId(null)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OpportunityCard({ opp, dragging, onDragStart, onDragEnd }: { opp: PipelineOpportunity; dragging: boolean; onDragStart: () => void; onDragEnd: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn("cursor-grab space-y-2 rounded-lg border border-border/60 bg-card p-3 shadow-soft transition-opacity active:cursor-grabbing", dragging && "opacity-40")}
    >
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={opp.contact?.avatarUrl ?? undefined} />
          <AvatarFallback className="text-[9px]">{initials(opp.contact?.name)}</AvatarFallback>
        </Avatar>
        <p className="truncate text-sm font-medium">{opp.contact?.name ?? opp.contact?.phoneNormalized ?? "Contato"}</p>
      </div>
      <p className="text-xs text-muted-foreground">{opp.service?.name ?? "Serviço não definido"}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">{opp.opportunity.valueCents ? formatCents(opp.opportunity.valueCents) : "—"}</span>
        {opp.lead && <LeadScoreBadge score={opp.lead.score} />}
      </div>
      {opp.lead?.createdAt && <p className="text-[11px] text-muted-foreground">{formatRelative(opp.lead.createdAt)}</p>}
    </div>
  );
}
