import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomers } from "@/hooks/use-customers";
import { useProjects } from "@/hooks/use-projects";
import { useCreateReceivable } from "@/hooks/use-finance";
import { ApiError } from "@/lib/api-client";

/** "Nova cobrança" — lançamento manual de valor a receber, para faturamento que não veio de uma venda fechada. */
export function CreateReceivableDialog() {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [amountReais, setAmountReais] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data: customers } = useCustomers();
  const { data: projects } = useProjects();
  const createReceivable = useCreateReceivable();

  const customerProjects = useMemo(() => projects?.filter((p) => p.customerId === customerId) ?? [], [projects, customerId]);

  function reset() {
    setCustomerId("");
    setProjectId("");
    setDescription("");
    setAmountReais("");
    setDueDate("");
  }

  function handleCustomerChange(id: string) {
    setCustomerId(id);
    setProjectId("");
  }

  async function handleCreate() {
    if (!customerId) {
      toast.error("Selecione o cliente");
      return;
    }
    if (description.trim().length < 2) {
      toast.error("Descreva a cobrança");
      return;
    }
    const amountCents = Math.round(Number(amountReais) * 100);
    if (!amountCents || amountCents <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (!dueDate) {
      toast.error("Informe a data de vencimento");
      return;
    }
    try {
      await createReceivable.mutateAsync({
        customerId,
        projectId: projectId || undefined,
        description: description.trim(),
        amountCents,
        dueDate,
      });
      toast.success("Cobrança lançada");
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível lançar a cobrança");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nova cobrança
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova cobrança</DialogTitle>
          <DialogDescription>Lance manualmente um valor a receber de um cliente, ligado ou não a um projeto.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={customerId} onValueChange={handleCustomerChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {customers?.length === 0 && <p className="text-xs text-muted-foreground">Nenhum cliente cadastrado ainda — cadastre um cliente primeiro.</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Projeto (opcional)</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={!customerId}>
              <SelectTrigger>
                <SelectValue placeholder={customerId ? "Ligar a um projeto do cliente" : "Selecione o cliente primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {customerProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {customerId && customerProjects.length === 0 && <p className="text-xs text-muted-foreground">Este cliente ainda não tem projetos cadastrados.</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Entrada do projeto, mensalidade, etc." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" min={0} step="0.01" value={amountReais} onChange={(e) => setAmountReais(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={createReceivable.isPending}>
            {createReceivable.isPending ? "Lançando..." : "Lançar cobrança"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
