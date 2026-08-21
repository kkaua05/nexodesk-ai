import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useLeads, useServices } from "@/hooks/use-leads";
import { useCreateProposal } from "@/hooks/use-proposals";
import { ApiError } from "@/lib/api-client";

export function CreateProposalDialog() {
  const [open, setOpen] = useState(false);
  const { data: leads } = useLeads();
  const { data: services } = useServices();
  const createProposal = useCreateProposal();

  const [leadId, setLeadId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [description, setDescription] = useState("");
  const [priceReais, setPriceReais] = useState(0);
  const [deliveryDays, setDeliveryDays] = useState(15);

  async function handleCreate() {
    if (!description || priceReais <= 0) {
      toast.error("Informe a descrição e o valor");
      return;
    }
    try {
      await createProposal.mutateAsync({
        leadId: leadId || undefined,
        serviceId: serviceId || undefined,
        items: [{ description, quantity: 1, unitPriceCents: Math.round(priceReais * 100) }],
        deliveryDays,
      });
      toast.success("Proposta criada");
      setOpen(false);
      setDescription("");
      setPriceReais(0);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível criar a proposta");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Nova proposta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova proposta</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Lead (opcional)</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um lead" />
              </SelectTrigger>
              <SelectContent>
                {leads?.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.contact?.name ?? l.contact?.phoneNormalized}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Serviço</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Landing Page — desenvolvimento completo" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" min={0} value={priceReais} onChange={(e) => setPriceReais(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo (dias)</Label>
              <Input type="number" min={1} value={deliveryDays} onChange={(e) => setDeliveryDays(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={createProposal.isPending}>
            {createProposal.isPending ? "Criando..." : "Criar proposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
