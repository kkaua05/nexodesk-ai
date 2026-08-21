import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, FolderKanban, Plus, User } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useUIStore } from "@/stores/ui-store";
import { api } from "@/lib/api-client";

interface SearchResults {
  customers: { id: string; name: string }[];
  contacts: { id: string; name: string | null; phoneNormalized: string }[];
  proposals: { id: string; number: string }[];
  projects: { id: string; name: string }[];
}

const QUICK_ACTIONS = [
  { label: "Novo lead", to: "/crm/leads", icon: User },
  { label: "Nova proposta", to: "/propostas", icon: FileText },
  { label: "Novo projeto", to: "/projetos", icon: FolderKanban },
];

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  const { data } = useQuery({
    queryKey: ["global-search", search],
    queryFn: () => api.get<SearchResults>(`/search?q=${encodeURIComponent(search)}`),
    enabled: search.length > 1,
  });

  function go(to: string) {
    setOpen(false);
    setSearch("");
    navigate(to);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <Command shouldFilter={false} className="flex flex-col">
          <Command.Input
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder="Pesquisar ou executar uma ação..."
            className="w-full border-b border-border/60 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-96 overflow-y-auto p-2 scrollbar-thin">
            <Command.Empty className="p-4 text-center text-sm text-muted-foreground">Nada encontrado.</Command.Empty>

            <Command.Group heading="Ações rápidas" className="px-2 py-1 text-xs font-medium text-muted-foreground">
              {QUICK_ACTIONS.map((action) => (
                <Command.Item
                  key={action.to}
                  onSelect={() => go(action.to)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  {action.label}
                </Command.Item>
              ))}
            </Command.Group>

            {data && (
              <>
                {data.customers.length > 0 && (
                  <Command.Group heading="Clientes" className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    {data.customers.map((c) => (
                      <Command.Item key={c.id} onSelect={() => go(`/crm/clientes/${c.id}`)} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {c.name}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                {data.contacts.length > 0 && (
                  <Command.Group heading="Contatos" className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    {data.contacts.map((c) => (
                      <Command.Item key={c.id} onSelect={() => go("/whatsapp")} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {c.name ?? c.phoneNormalized}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                {data.proposals.length > 0 && (
                  <Command.Group heading="Propostas" className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    {data.proposals.map((p) => (
                      <Command.Item key={p.id} onSelect={() => go("/propostas")} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {p.number}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                {data.projects.length > 0 && (
                  <Command.Group heading="Projetos" className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    {data.projects.map((p) => (
                      <Command.Item key={p.id} onSelect={() => go(`/projetos/${p.id}`)} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent">
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                        {p.name}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
