import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useNotifications } from "@/hooks/use-notifications";
import { initials, formatRelative } from "@/lib/format";
import { api } from "@/lib/api-client";
import { WhatsappStatusBadge } from "@/components/whatsapp/whatsapp-status-badge";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;

  function markRead(id: string) {
    api.post(`/notifications/${id}/read`).then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
  }

  function markAllRead() {
    api.post("/notifications/read-all").then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/60 bg-background/80 px-6 backdrop-blur">
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/40"
      >
        <Search className="h-4 w-4" />
        Pesquisar clientes, leads, propostas...
        <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-3">
        <WhatsappStatusBadge />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <span className="text-sm font-semibold">Notificações</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {!notifications || notifications.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
              ) : (
                notifications.slice(0, 15).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className="flex w-full flex-col gap-0.5 border-b border-border/40 px-4 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <span className={n.readAt ? "text-foreground/70" : "font-medium text-foreground"}>{n.title}</span>
                    {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                    <span className="text-[11px] text-muted-foreground">{formatRelative(n.createdAt)}</span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full">
              <Avatar>
                <AvatarImage src={user?.avatarUrl ?? undefined} />
                <AvatarFallback>{initials(user?.name)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/configuracoes")}>Configurações</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
