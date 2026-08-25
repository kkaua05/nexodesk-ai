import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCustomer } from "@/hooks/use-customers";
import { ApiError } from "@/lib/api-client";

/** "Novo cliente" — cadastro manual, para clientes que não vieram de um lead convertido. */
export function CreateCustomerDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const createCustomer = useCreateCustomer();

  function reset() {
    setName("");
    setPhone("");
    setEmail("");
    setCompany("");
  }

  async function handleCreate() {
    if (name.trim().length < 2) {
      toast.error("Informe o nome do cliente");
      return;
    }
    if (phone.trim().length < 8) {
      toast.error("Informe um número de celular válido");
      return;
    }
    try {
      await createCustomer.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
      });
      toast.success("Cliente cadastrado");
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível cadastrar o cliente");
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
          Novo cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>Cadastre um cliente manualmente, com nome e número de celular.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Celular</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 51 99999-0000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>E-mail (opcional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Empresa (opcional)</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nome da empresa" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={createCustomer.isPending}>
            {createCustomer.isPending ? "Cadastrando..." : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
