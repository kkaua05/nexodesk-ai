import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/format";
import { useLeads } from "@/hooks/use-leads";
import { useProposals } from "@/hooks/use-proposals";
import { useFinancialOverview } from "@/hooks/use-finance";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useServicesSoldChart } from "@/hooks/use-dashboard";

export function ReportsPage() {
  const { data: leads } = useLeads();
  const { data: proposals } = useProposals();
  const overview = useFinancialOverview().data;
  const { data: projects } = useProjects();
  const { data: tasks } = useTasks();
  const { data: servicesSold } = useServicesSoldChart();

  const won = leads?.filter((l) => l.status === "ganho").length ?? 0;
  const total = leads?.length ?? 0;
  const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : "0";
  const acceptedProposals = proposals?.filter((p) => p.status === "aceita") ?? [];
  const ticketMedioCents = acceptedProposals.length > 0 ? Math.round(acceptedProposals.reduce((sum, p) => sum + p.totalCents, 0) / acceptedProposals.length) : 0;
  const overdueProjects = projects?.filter((p) => p.dueDate && new Date(p.dueDate) < new Date() && p.status !== "concluido").length ?? 0;
  const overdueTasks = tasks?.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "concluida").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Visão consolidada comercial, financeira e operacional.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Comercial</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Leads" value={total} />
          <Metric label="Conversão" value={`${conversionRate}%`} />
          <Metric label="Propostas aceitas" value={acceptedProposals.length} />
          <Metric label="Ticket médio" value={formatCents(ticketMedioCents)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Faturamento" value={overview ? formatCents(overview.faturamentoCents) : "—"} />
          <Metric label="Despesas" value={overview ? formatCents(overview.despesasCents) : "—"} />
          <Metric label="Lucro" value={overview ? formatCents(overview.lucroCents) : "—"} />
          <Metric label="Inadimplência" value={overview ? formatCents(overview.vencidoCents) : "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Operacional</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Projetos ativos" value={projects?.filter((p) => !["concluido", "cancelado"].includes(p.status)).length ?? 0} />
          <Metric label="Projetos atrasados" value={overdueProjects} />
          <Metric label="Tarefas atrasadas" value={overdueTasks} />
          <Metric label="Serviço mais vendido" value={servicesSold?.[0]?.service ?? "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
