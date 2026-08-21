import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

interface CompanySettings {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  currency: string;
  timezone: string;
}

export function CompanySettings() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings-company"], queryFn: () => api.get<CompanySettings | null>("/settings/company") });
  const [form, setForm] = useState<CompanySettings>({ name: "", currency: "BRL", timezone: "America/Sao_Paulo" });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (values: CompanySettings) => api.put("/settings/company", values),
    onSuccess: () => {
      toast.success("Dados da empresa salvos");
      queryClient.invalidateQueries({ queryKey: ["settings-company"] });
    },
  });

  return (
    <Card className="max-w-xl">
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label>Nome da empresa</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Endereço</Label>
          <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.name}>
          {save.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  );
}
