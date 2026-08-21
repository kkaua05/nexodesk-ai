import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { initials, formatRelative } from "@/lib/format";
import { useUsers, useCreateUser } from "@/hooks/use-users";
import { USER_ROLE } from "@nexodesk/shared";
import type { UserRole } from "@nexodesk/shared";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  comercial: "Comercial",
  financeiro: "Financeiro",
  atendimento: "Atendimento",
};

export function UsersSettings() {
  const { data: users, isLoading } = useUsers();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === "owner";

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Usuários com acesso ao NexoDesk.</p>
        {isOwner && <CreateUserDialog />}
      </div>

      <Card>
        <CardContent className="divide-y divide-border/60 p-0">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Carregando...</p>}
          {users?.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback>{initials(user.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user.lastLoginAt && <span className="text-xs text-muted-foreground">Último acesso {formatRelative(user.lastLoginAt)}</span>}
                <Badge variant={user.role === "owner" ? "default" : "secondary"}>{ROLE_LABEL[user.role]}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const createUser = useCreateUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("atendimento");

  async function handleCreate() {
    if (!name || !email || password.length < 6) {
      toast.error("Preencha nome, e-mail e uma senha com pelo menos 6 caracteres");
      return;
    }
    try {
      await createUser.mutateAsync({ name, email, password, role });
      toast.success("Usuário criado");
      setOpen(false);
      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível criar o usuário");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Novo usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Perfil</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLE.filter((r) => r !== "owner").map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={createUser.isPending}>
            {createUser.isPending ? "Criando..." : "Criar usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
