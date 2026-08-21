import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";

interface AiSettings {
  model: string;
  status: "online" | "offline";
  url?: string;
}

export function AiSettings() {
  const queryClient = useQueryClient();
  const { data, isFetching } = useQuery({ queryKey: ["settings-ai"], queryFn: () => api.get<AiSettings>("/settings/ai") });

  async function testConnection() {
    await queryClient.invalidateQueries({ queryKey: ["settings-ai"] });
    const result = await api.get<{ available: boolean }>("/settings/ai/test");
    toast[result.available ? "success" : "error"](result.available ? "Ollama está online" : "Não foi possível conectar ao Ollama");
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", data?.status === "online" ? "bg-success" : "bg-muted-foreground")} />
            <span className="font-medium">Ollama — {isFetching ? "verificando..." : data?.status === "online" ? "Online" : "Offline"}</span>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Modelo</span>
            <span className="font-medium">{data?.model ?? "—"}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          A IA roda 100% local via Ollama. Se estiver offline, o sistema continua funcionando normalmente — apenas os recursos de IA (análise de
          conversas, sugestões, Nexo AI) ficam indisponíveis temporariamente.
        </p>

        <Button size="sm" variant="outline" onClick={testConnection}>
          Testar conexão
        </Button>
      </CardContent>
    </Card>
  );
}
