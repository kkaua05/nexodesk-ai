import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCents, formatDate } from "@/lib/format";
import { useProposals, useUpdateProposalStatus } from "@/hooks/use-proposals";
import { PROPOSAL_STATUS } from "@nexodesk/shared";
import type { ProposalStatus } from "@nexodesk/shared";
import { CreateProposalDialog } from "./create-proposal-dialog";

export function ProposalsPage() {
  const { data: proposals, isLoading } = useProposals();
  const updateStatus = useUpdateProposalStatus();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Propostas</h1>
          <p className="text-sm text-muted-foreground">Propostas comerciais enviadas aos leads e clientes.</p>
        </div>
        <CreateProposalDialog />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (!proposals || proposals.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhuma proposta criada ainda.
                </TableCell>
              </TableRow>
            )}
            {proposals?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.number}</TableCell>
                <TableCell>{formatCents(p.totalCents)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                <TableCell className="text-muted-foreground">{p.validUntil ? formatDate(p.validUntil) : "—"}</TableCell>
                <TableCell>
                  <Select value={p.status} onValueChange={(value) => updateStatus.mutate({ id: p.id, status: value as ProposalStatus })}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPOSAL_STATUS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
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
