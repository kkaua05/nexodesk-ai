import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomers } from "@/hooks/use-customers";
import { useServices } from "@/hooks/use-leads";
import { useCreateProject } from "@/hooks/use-projects";
import { ApiError } from "@/lib/api-client";

/** "Novo projeto" — cadastro manual, para projetos que não vieram de uma venda fechada. */
export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [valueReais, setValueReais] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data: customers } = useCustomers();
  const { data: services } = useServices();
  const createProject = useCreateProject();

  function reset() {
    setCustomerId("");
    setServiceId("");
    setName("");
    setDescription("");
    setValueReais("");
    setDueDate("");
  }

  function handleServiceChange(id: string) {
    setServiceId(id);
    const service = services?.find((s) => s.id === id);
    if (service && !name.trim()) setName(service.name);
  }

  async function handleCreate() {
    if (!customerId) {
      toast.error("Selecione o cliente");
      return;
    }
    if (name.trim().length < 2) {
      toast.error("Informe o nome do projeto");
      return;
    }
    try {
      await createProject.mutateAsync({
        customerId,
        name: name.trim(),
        serviceId: serviceId || undefined,
        description: description.trim() || undefined,
        valueCents: valueReais ? Math.round(Number(valueReais) * 100) : undefined,
        dueDate: dueDate || undefined,
      });
      toast.success("Projeto criado");
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível criar o projeto");
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
          Novo projeto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo projeto</DialogTitle>
          <DialogDescription>Cadastre manualmente o projeto que o cliente pediu.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
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
            <Label>Tipo de projeto (opcional)</Label>
            <Select value={serviceId} onValueChange={handleServiceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de serviço pedido" />
              </SelectTrigger>
              <SelectContent>
                {services
                  ?.filter((s) => s.isActive)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nome do projeto</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Site institucional — Empresa X" />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes do que foi pedido" className="min-h-[70px]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$, opcional)</Label>
              <Input type="number" min={0} value={valueReais} onChange={(e) => setValueReais(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo (opcional)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={createProject.isPending}>
            {createProject.isPending ? "Criando..." : "Criar projeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
