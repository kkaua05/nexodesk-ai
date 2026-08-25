import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCents, formatDate } from "@/lib/format";
import { useFinancialOverview, useReceivables, usePayables, useRegisterReceivablePayment } from "@/hooks/use-finance";
import { useCustomers } from "@/hooks/use-customers";
import { useProjects } from "@/hooks/use-projects";
import { CreateReceivableDialog } from "./create-receivable-dialog";

const RECEIVABLE_STATUS_VARIANT: Record<string, "success" | "destructive" | "secondary"> = {
  pago: "success",
  vencido: "destructive",
  pendente: "secondary",
  parcial: "secondary",
  cancelado: "secondary",
};

export function FinancePage() {
  const { data: overview } = useFinancialOverview();
  const { data: receivables } = useReceivables();
  const { data: payables } = usePayables();
  const { data: customers } = useCustomers();
  const { data: projects } = useProjects();
  const registerPayment = useRegisterReceivablePayment();

  const customerById = useMemo(() => new Map(customers?.map((c) => [c.id, c])), [customers]);
  const projectById = useMemo(() => new Map(projects?.map((p) => [p.id, p])), [projects]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visão geral de receitas, despesas e recebimentos, ligados a clientes e projetos.</p>
        </div>
        <CreateReceivableDialog />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniCard label="Faturamento" value={overview?.faturamentoCents} />
        <MiniCard label="Recebido" value={overview?.recebidoCents} tone="success" />
        <MiniCard label="A receber" value={overview?.aReceberCents} />
        <MiniCard label="Vencido" value={overview?.vencidoCents} tone="destructive" />
      </div>

      <Tabs defaultValue="receber">
        <TabsList>
          <TabsTrigger value="receber">Contas a receber</TabsTrigger>
          <TabsTrigger value="pagar">Contas a pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="receber">
          <div className="space-y-2">
            {receivables?.map((r) => {
              const customer = customerById.get(r.customerId);
              const project = r.projectId ? projectById.get(r.projectId) : undefined;
              return (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{r.description}</p>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {customer && (
                        <Link to={`/crm/clientes/${customer.id}`} className="hover:text-foreground hover:underline">
                          {customer.name}
                        </Link>
                      )}
                      {project && <span>· {project.name}</span>}
                      <span>· Vencimento {formatDate(r.dueDate)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCents(r.amountCents)}</p>
                      <p className="text-xs text-muted-foreground">Pago: {formatCents(r.paidAmountCents)}</p>
                    </div>
                    <Badge variant={RECEIVABLE_STATUS_VARIANT[r.status]}>{r.status}</Badge>
                    {r.status !== "pago" && r.status !== "cancelado" && (
                      <Button size="sm" variant="outline" onClick={() => registerPayment.mutate({ id: r.id, amountCents: r.amountCents - r.paidAmountCents })}>
                        Marcar como pago
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })}
            {(!receivables || receivables.length === 0) && <p className="text-sm text-muted-foreground">Nenhum lançamento.</p>}
          </div>
        </TabsContent>

        <TabsContent value="pagar">
          <div className="space-y-2">
            {payables?.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{p.description}</p>
                    <p className="text-xs text-muted-foreground">Vencimento {formatDate(p.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold">{formatCents(p.amountCents)}</p>
                    <Badge variant={RECEIVABLE_STATUS_VARIANT[p.status]}>{p.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!payables || payables.length === 0) && <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniCard({ label, value, tone }: { label: string; value: number | undefined; tone?: "success" | "destructive" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold ${tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""}`}>
          {value !== undefined ? formatCents(value) : "—"}
        </p>
      </CardContent>
    </Card>
  );
}
