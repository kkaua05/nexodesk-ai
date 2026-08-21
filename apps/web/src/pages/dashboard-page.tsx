import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Users, MessageSquareText, FileText, TrendingUp, FolderKanban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCents, formatTime } from "@/lib/format";
import {
  useDashboardSummary,
  useDashboardToday,
  useLeadsByPeriodChart,
  useRevenueVsExpensesChart,
  useServicesSoldChart,
  useLeadsByOriginChart,
} from "@/hooks/use-dashboard";
import { useFollowUps } from "@/hooks/use-followups";

const CHART_COLORS = ["#5B2EFF", "#8B6BFF", "#B8A5FF", "#29145F", "#D4C9FF"];

export function DashboardPage() {
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: today } = useDashboardToday();
  const { data: leadsByPeriod } = useLeadsByPeriodChart();
  const { data: revenueVsExpenses } = useRevenueVsExpensesChart();
  const { data: servicesSold } = useServicesSoldChart();
  const { data: leadsByOrigin } = useLeadsByOriginChart();
  const { data: followUps } = useFollowUps();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Como está sua empresa hoje.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard icon={Users} label="Novos leads (7d)" value={summary?.newLeadsLast7Days} loading={isLoading} />
        <SummaryCard icon={MessageSquareText} label="Conversas aguardando" value={summary?.conversationsAwaiting} loading={isLoading} />
        <SummaryCard icon={FileText} label="Propostas em aberto" value={summary?.openProposals} loading={isLoading} />
        <SummaryCard icon={TrendingUp} label="Valor no pipeline" value={summary ? formatCents(summary.pipelineValueCents) : undefined} loading={isLoading} />
        <SummaryCard icon={FolderKanban} label="Projetos ativos" value={summary?.activeProjects} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FinanceMiniCard label="Faturamento" cents={summary?.financial.faturamentoCents} />
        <FinanceMiniCard label="Recebido" cents={summary?.financial.recebidoCents} tone="success" />
        <FinanceMiniCard label="A receber" cents={summary?.financial.aReceberCents} />
        <FinanceMiniCard label="Vencido" cents={summary?.financial.vencidoCents} tone="destructive" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-foreground">Receita x Despesas</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueVsExpenses ?? []}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B2EFF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#5B2EFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 100)}`} />
                <Tooltip formatter={(value: number) => formatCents(value)} />
                <Area type="monotone" dataKey="revenueCents" name="Receita" stroke="#5B2EFF" fill="url(#revenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="expensesCents" name="Despesas" stroke="#78738C" fill="none" strokeWidth={2} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Origem dos leads</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leadsByOrigin ?? []} dataKey="count" nameKey="origin" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {(leadsByOrigin ?? []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-foreground">Leads por período</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadsByPeriod ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" name="Leads" stroke="#5B2EFF" fill="#5B2EFF" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Serviços mais vendidos</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={servicesSold ?? []} layout="vertical" margin={{ left: 12 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="service" tick={{ fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#5B2EFF" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {!today || today.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada agendado para hoje.</p>
            ) : (
              today.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted/50">
                  <div>
                    <p className="font-medium">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(entry.startAt)}</p>
                  </div>
                  {entry.valueCents !== undefined && <span className="text-xs font-medium text-primary">{formatCents(entry.valueCents)}</span>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Follow-ups pendentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {!followUps || followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum follow-up pendente.</p>
            ) : (
              followUps.slice(0, 6).map((f) => (
                <div key={f.id} className="rounded-lg px-2 py-2 text-sm hover:bg-muted/50">
                  <p className="font-medium">{f.note ?? f.reason}</p>
                  <p className="text-xs text-muted-foreground">{f.reason.replaceAll("_", " ")}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, loading }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number | undefined; loading: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="mt-1 h-6 w-16" /> : <p className="text-xl font-semibold">{value ?? "—"}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function FinanceMiniCard({ label, cents, tone }: { label: string; cents: number | undefined; tone?: "success" | "destructive" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold ${tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""}`}>
          {cents === undefined ? <Skeleton className="mt-1 h-6 w-20" /> : formatCents(cents)}
        </p>
      </CardContent>
    </Card>
  );
}
