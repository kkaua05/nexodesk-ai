import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { useAutomations, useAutomationSettingsMap, useUpdateAutomationSettings, useAutomationRuns } from "@/hooks/use-automations";

const RUN_STATUS_VARIANT: Record<string, "success" | "destructive" | "secondary"> = {
  sucesso: "success",
  erro: "destructive",
  pulado: "secondary",
};

export function AutomationsPage() {
  const { data: automations } = useAutomations();
  const { data: settingsMap } = useAutomationSettingsMap();
  const updateSettings = useUpdateAutomationSettings();
  const { data: runs } = useAutomationRuns();

  function toggle(key: string, value: boolean) {
    updateSettings.mutate({ ...(settingsMap ?? {}), [key]: value });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Automações</h1>
        <p className="text-sm text-muted-foreground">Regras que rodam automaticamente para manter o CRM em dia.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {automations?.map((automation) => (
          <Card key={automation.id}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium">{automation.name}</p>
                <p className="text-xs text-muted-foreground">{automation.description}</p>
              </div>
              <Switch checked={automation.isEnabled} onCheckedChange={(checked) => toggle(automation.key, checked)} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Execuções recentes</h2>
        <Card>
          <CardContent className="divide-y divide-border/60 p-0">
            {(!runs || runs.length === 0) && <p className="p-4 text-sm text-muted-foreground">Nenhuma execução ainda.</p>}
            {runs?.map((run) => (
              <div key={run.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{run.automationKey.replaceAll("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(run.startedAt)}</p>
                </div>
                <Badge variant={RUN_STATUS_VARIANT[run.status]}>{run.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
