import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWhatsappStatus } from "@/hooks/use-whatsapp-status";
import { api, ApiError } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/lib/format";
import type { WhatsappConnectionStatus } from "@nexodesk/shared";

const STATUS_LABEL: Record<WhatsappConnectionStatus, string> = {
  conectado: "Conectado",
  conectando: "Conectando",
  qr_necessario: "QR Code necessário",
  desconectado: "Desconectado",
  reconectando: "Reconectando",
  erro: "Erro",
};

const STATUS_COLOR: Record<WhatsappConnectionStatus, string> = {
  conectado: "bg-success",
  conectando: "bg-warning",
  qr_necessario: "bg-warning",
  desconectado: "bg-muted-foreground",
  reconectando: "bg-warning",
  erro: "bg-destructive",
};

export function IntegrationsSettings() {
  const { data: status } = useWhatsappStatus();
  const queryClient = useQueryClient();

  async function run(action: "connect" | "disconnect" | "clear-session") {
    try {
      await api.post(`/whatsapp/${action}`);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] });
      toast.success("Ação executada");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível executar a ação");
    }
  }

  const current = status?.status ?? "desconectado";

  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_COLOR[current])} />
              <span className="font-medium">WhatsApp — {STATUS_LABEL[current]}</span>
            </div>
          </div>

          {status?.phoneNumber && <InfoRow label="Número conectado" value={status.phoneNumber} />}
          {status?.connectedSince && <InfoRow label="Conectado desde" value={formatDateTime(status.connectedSince)} />}
          {status?.deviceInfo && <InfoRow label="Dispositivo" value={status.deviceInfo} />}
          {status?.lastError && <InfoRow label="Último erro" value={status.lastError} />}

          {current === "qr_necessario" && status?.qr && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-4">
              <img src={status.qr} alt="QR Code do WhatsApp" className="h-56 w-56" />
              <p className="text-xs text-muted-foreground">Escaneie com o WhatsApp do celular: Aparelhos conectados → Conectar aparelho</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => run("connect")} disabled={current === "conectado"}>
              Conectar
            </Button>
            <Button size="sm" variant="outline" onClick={() => run("disconnect")} disabled={current === "desconectado"}>
              Desconectar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => run("clear-session")}>
              Limpar sessão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
