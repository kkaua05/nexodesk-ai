import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCents, formatDate, initials } from "@/lib/format";
import { useCustomers } from "@/hooks/use-customers";
import { CreateCustomerDialog } from "./create-customer-dialog";

export function CustomersPage() {
  const { data: customers, isLoading } = useCustomers();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!customers) return [];
    const term = search.toLowerCase();
    return customers.filter((c) => !term || c.name.toLowerCase().includes(term) || c.contact?.phoneNormalized.includes(term));
  }, [customers, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">Clientes cadastrados manualmente ou convertidos a partir de leads ganhos.</p>
        </div>
        <CreateCustomerDialog />
      </div>

      <div className="relative w-full max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar cliente..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum cliente ainda. Cadastre um cliente ou feche uma venda para vê-lo aqui.</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((customer) => (
          <Link key={customer.id} to={`/crm/clientes/${customer.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={customer.contact?.avatarUrl ?? undefined} />
                    <AvatarFallback>{initials(customer.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">Cliente desde {formatDate(customer.customerSince)}</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-between text-xs">
                  <div>
                    <p className="text-muted-foreground">Contratado</p>
                    <p className="font-medium">{formatCents(customer.financial.totalContractedCents)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Recebido</p>
                    <p className="font-medium text-success">{formatCents(customer.financial.receivedCents)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pendente</p>
                    <p className="font-medium">{formatCents(customer.financial.pendingCents)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
