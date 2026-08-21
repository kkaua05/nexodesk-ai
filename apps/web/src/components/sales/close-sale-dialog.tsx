import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServices, type Lead } from "@/hooks/use-leads";
import { useCloseSale } from "@/hooks/use-sales";
import { formatCents } from "@/lib/format";
import { ApiError } from "@/lib/api-client";

export function CloseSaleDialog({ lead, open, onOpenChange }: { lead: Lead; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: services } = useServices();
  const closeSale = useCloseSale();

  const defaultService = services?.find((s) => s.id === lead.serviceId) ?? services?.[0];
  const [serviceId, setServiceId] = useState(lead.serviceId ?? "");
  const [totalReais, setTotalReais] = useState(defaultService ? defaultService.basePriceCents / 100 : 0);
  const [downPaymentReais, setDownPaymentReais] = useState(defaultService?.suggestedDownPaymentCents ? defaultService.suggestedDownPaymentCents / 100 : 0);
  const [installments, setInstallments] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [deliveryDays, setDeliveryDays] = useState(defaultService?.averageDeliveryDays ?? 15);

  const remaining = Math.max(0, totalReais - downPaymentReais);

  async function handleConfirm() {
    if (!serviceId) {
      toast.error("Selecione um serviço");
      return;
    }
    try {
      await closeSale.mutateAsync({
        leadId: lead.id,
        serviceId,
        totalCents: Math.round(totalReais * 100),
        downPaymentCents: Math.round(downPaymentReais * 100),
        installmentCount: installments,
        paymentMethod,
        deliveryDays,
      });
      toast.success("Venda registrada com sucesso! Cliente e projeto criados.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível registrar a venda");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar venda</DialogTitle>
          <DialogDescription>Cliente, projeto e financeiro serão criados automaticamente.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor total (R$)</Label>
              <Input type="number" min={0} value={totalReais} onChange={(e) => setTotalReais(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Entrada (R$)</Label>
              <Input type="number" min={0} value={downPaymentReais} onChange={(e) => setDownPaymentReais(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Parcelas do restante</Label>
              <Input type="number" min={1} value={installments} onChange={(e) => setInstallments(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo (dias)</Label>
              <Input type="number" min={1} value={deliveryDays} onChange={(e) => setDeliveryDays(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Cartão">Cartão</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
                <SelectItem value="Transferência">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Restante</span>
              <span className="font-medium">{formatCents(Math.round(remaining * 100))}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={closeSale.isPending}>
            {closeSale.isPending ? "Registrando..." : "Confirmar venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
