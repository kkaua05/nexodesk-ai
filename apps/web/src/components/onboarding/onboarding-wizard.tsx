import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useOnboardingStatus, useCompleteOnboarding } from "@/hooks/use-onboarding";
import { useWhatsappStatus } from "@/hooks/use-whatsapp-status";
import { useAiSettingsProbe } from "@/hooks/use-ai-status";

const STEPS = ["Empresa", "Usuário", "WhatsApp", "IA", "Finalizar"] as const;

export function OnboardingWizard() {
  const { data: status, isLoading } = useOnboardingStatus();
  const completeOnboarding = useCompleteOnboarding();
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");

  const { data: whatsapp } = useWhatsappStatus();
  const aiStatus = useAiSettingsProbe();

  if (isLoading || status?.completed) return null;

  async function saveCompanyAndAdvance() {
    if (companyName.trim()) {
      await api.put("/settings/company", { name: companyName.trim(), currency: "BRL", timezone: "America/Sao_Paulo" });
    }
    setStep((s) => s + 1);
  }

  async function finish() {
    await completeOnboarding.mutateAsync();
    toast.success("Configuração inicial concluída — bem-vindo ao NexoDesk!");
  }

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Bem-vindo ao NexoDesk</DialogTitle>
          <DialogDescription>Vamos configurar o essencial antes de começar.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1.5">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-1.5">
              <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold", i < step ? "bg-success text-success-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={cn("h-0.5 flex-1", i < step ? "bg-success" : "bg-muted")} />}
            </div>
          ))}
        </div>

        <div className="min-h-[140px] py-2">
          {step === 0 && (
            <div className="space-y-2">
              <Label>Nome da empresa</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: Minha Agência Digital" autoFocus />
            </div>
          )}

          {step === 1 && (
            <p className="text-sm text-muted-foreground">
              Você já está configurado como <strong>Owner</strong> — o perfil com acesso total ao sistema. Novos usuários podem ser adicionados depois em Configurações.
            </p>
          )}

          {step === 2 && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Status atual: <strong>{whatsapp?.status ?? "desconectado"}</strong>
              </p>
              <p className="text-muted-foreground">Conecte agora em Configurações → Integrações escaneando o QR Code, ou faça isso depois.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {aiStatus.data?.provider === "groq" ? "Groq" : "Ollama"}: <strong>{aiStatus.data?.available ? "online" : "offline"}</strong>
              </p>
              <p className="text-muted-foreground">A IA é opcional — o sistema funciona normalmente mesmo sem ela disponível.</p>
            </div>
          )}

          {step === 4 && <p className="text-sm text-muted-foreground">Tudo pronto! Você pode ajustar qualquer configuração depois, a qualquer momento.</p>}
        </div>

        <DialogFooter>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              Voltar
            </Button>
          )}
          {step === 0 ? (
            <Button onClick={saveCompanyAndAdvance}>Continuar</Button>
          ) : step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Continuar</Button>
          ) : (
            <Button onClick={finish} disabled={completeOnboarding.isPending}>
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
