import { useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStartConversation } from "@/hooks/use-conversations";
import { ApiError } from "@/lib/api-client";

/** "Adicionar contato" — inicia uma conversa com um número que ainda não escreveu para a empresa. */
export function NewConversationDialog({ onCreated }: { onCreated?: (conversationId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const startConversation = useStartConversation();

  async function handleCreate() {
    if (!phone.trim()) {
      toast.error("Informe o número de telefone");
      return;
    }
    try {
      const conversation = await startConversation.mutateAsync({ phone: phone.trim(), name: name.trim() || undefined, message: message.trim() || undefined });
      toast.success("Contato adicionado");
      setOpen(false);
      setPhone("");
      setName("");
      setMessage("");
      onCreated?.(conversation.id);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível adicionar o contato");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <UserPlus className="h-4 w-4" />
          Adicionar contato
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar contato</DialogTitle>
          <DialogDescription>Inicie uma conversa com um número que ainda não escreveu para você.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 51 99999-0000" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Nome (opcional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do contato" />
          </div>
          <div className="space-y-1.5">
            <Label>Primeira mensagem (opcional)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Envie a primeira mensagem agora, se quiser" className="min-h-[70px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={startConversation.isPending}>
            {startConversation.isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
