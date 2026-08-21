import { useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCents, formatDate, formatDateTime, initials } from "@/lib/format";
import { useCustomer, useCustomerTimeline, useCustomerProjects, useCustomerProposals, useCustomerReceivables } from "@/hooks/use-customers";
import { NotesPanel } from "@/components/notes/notes-panel";
import { FilesPanel } from "@/components/attachments/files-panel";

const TIMELINE_ICON: Record<string, string> = {
  whatsapp_contact: "💬",
  lead_classified: "🤖",
  proposal_created: "📄",
  sale_won: "✅",
  payment_received: "💰",
  project_created: "🚀",
};

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer } = useCustomer(id);
  const { data: timeline } = useCustomerTimeline(id);
  const { data: projects } = useCustomerProjects(id);
  const { data: proposals } = useCustomerProposals(id);
  const { data: receivables } = useCustomerReceivables(id);

  if (!customer) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={customer.contact?.avatarUrl ?? undefined} />
            <AvatarFallback className="text-lg">{initials(customer.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{customer.name}</h1>
            <p className="text-sm text-muted-foreground">Cliente desde {formatDate(customer.customerSince)}</p>
          </div>
          <div className="ml-auto flex gap-8 text-sm">
            <div>
              <p className="text-muted-foreground">Total contratado</p>
              <p className="text-lg font-semibold">{formatCents(customer.financial.totalContractedCents)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Recebido</p>
              <p className="text-lg font-semibold text-success">{formatCents(customer.financial.receivedCents)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pendente</p>
              <p className="text-lg font-semibold">{formatCents(customer.financial.pendingCents)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Histórico</TabsTrigger>
          <TabsTrigger value="projects">Projetos</TabsTrigger>
          <TabsTrigger value="proposals">Propostas</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="files">Arquivos</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="space-y-4 p-6">
              {!timeline || timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem eventos ainda.</p>
              ) : (
                timeline.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <span className="text-lg leading-none">{TIMELINE_ICON[event.type] ?? "•"}</span>
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</p>
                      {event.valueCents !== null && <p className="text-xs font-semibold text-primary">{formatCents(event.valueCents)}</p>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <div className="grid gap-3 sm:grid-cols-2">
            {projects?.map((p) => (
              <Card key={p.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{p.name}</p>
                    <Badge variant="secondary">{p.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <Progress value={p.progress} />
                  <p className="text-xs text-muted-foreground">{p.valueCents ? formatCents(p.valueCents) : "—"}</p>
                </CardContent>
              </Card>
            ))}
            {(!projects || projects.length === 0) && <p className="text-sm text-muted-foreground">Nenhum projeto.</p>}
          </div>
        </TabsContent>

        <TabsContent value="proposals">
          <div className="space-y-2">
            {proposals?.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{p.number}</p>
                    <Badge variant="secondary" className="mt-1">
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold">{formatCents(p.totalCents)}</p>
                </CardContent>
              </Card>
            ))}
            {(!proposals || proposals.length === 0) && <p className="text-sm text-muted-foreground">Nenhuma proposta.</p>}
          </div>
        </TabsContent>

        <TabsContent value="financial">
          <div className="space-y-2">
            {receivables?.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{r.description}</p>
                    <p className="text-xs text-muted-foreground">Vencimento {formatDate(r.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCents(r.amountCents)}</p>
                    <Badge variant={r.status === "pago" ? "success" : r.status === "vencido" ? "destructive" : "secondary"}>{r.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!receivables || receivables.length === 0) && <p className="text-sm text-muted-foreground">Nenhum lançamento.</p>}
          </div>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardContent className="p-6">
              <FilesPanel entityType="customer" entityId={customer.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="p-6">
              <NotesPanel entityType="customer" entityId={customer.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
