import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { LeadScoreBadge } from "@/components/leads/lead-score-badge";
import { formatCents, formatRelative, initials } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLeads, useUpdateLeadStatus } from "@/hooks/use-leads";
import type { LeadStatus } from "@nexodesk/shared";

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "contato", label: "Contato" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "orcamento", label: "Orçamento" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
  { value: "ganho", label: "Ganho" },
  { value: "perdido", label: "Perdido" },
];

export function LeadsPage() {
  const { data: leads, isLoading } = useLeads();
  const updateStatus = useUpdateLeadStatus();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const filtered = useMemo(() => {
    if (!leads) return [];
    return leads
      .filter((l) => statusFilter === "todos" || l.status === statusFilter)
      .filter((l) => {
        const term = search.toLowerCase();
        if (!term) return true;
        return (l.contact?.name?.toLowerCase().includes(term) ?? false) || (l.contact?.phoneNormalized.includes(term) ?? false);
      })
      .sort((a, b) => b.score - a.score);
  }, [leads, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">Leads capturados automaticamente pelo WhatsApp e outras origens.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou telefone..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Interesse</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Valor potencial</TableHead>
              <TableHead>Último contato</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum lead encontrado. Quando uma nova pessoa entrar em contato pelo WhatsApp, ela aparecerá aqui.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={lead.contact?.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-[10px]">{initials(lead.contact?.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{lead.contact?.name ?? lead.contact?.phoneNormalized ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{lead.contact?.phoneNormalized}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{lead.service?.name ?? "—"}</TableCell>
                <TableCell className="text-sm capitalize">{lead.origin}</TableCell>
                <TableCell>
                  <LeadScoreBadge score={lead.score} />
                </TableCell>
                <TableCell className="text-sm">{lead.potentialValueCents ? formatCents(lead.potentialValueCents) : "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatRelative(lead.createdAt)}</TableCell>
                <TableCell>
                  <Select value={lead.status} onValueChange={(value) => updateStatus.mutate({ id: lead.id, status: value as LeadStatus })}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
