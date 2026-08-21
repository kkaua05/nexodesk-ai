import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useWhatsappStatus } from "@/hooks/use-whatsapp-status";
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

export function WhatsappStatusBadge() {
  const { data } = useWhatsappStatus();
  const status = data?.status ?? "desconectado";

  return (
    <Link
      to="/configuracoes/integracoes"
      className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-sm transition-colors hover:border-primary/40"
    >
      <span className={cn("h-2 w-2 rounded-full", STATUS_COLOR[status])} />
      WhatsApp
      <span className="text-muted-foreground">{STATUS_LABEL[status]}</span>
    </Link>
  );
}
