import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  Building2,
  Kanban,
  FolderKanban,
  Wallet,
  CalendarDays,
  FileText,
  Zap,
  Sparkles,
  BarChart3,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard }] },
  { items: [{ label: "WhatsApp", to: "/whatsapp", icon: MessageCircle }] },
  {
    label: "CRM",
    items: [
      { label: "Leads", to: "/crm/leads", icon: Users },
      { label: "Clientes", to: "/crm/clientes", icon: Building2 },
      { label: "Pipeline", to: "/crm/pipeline", icon: Kanban },
    ],
  },
  {
    items: [
      { label: "Projetos", to: "/projetos", icon: FolderKanban },
      { label: "Financeiro", to: "/financeiro", icon: Wallet },
      { label: "Agenda", to: "/agenda", icon: CalendarDays },
      { label: "Propostas", to: "/propostas", icon: FileText },
      { label: "Automações", to: "/automacoes", icon: Zap },
      { label: "Nexo AI", to: "/nexo-ai", icon: Sparkles },
      { label: "Relatórios", to: "/relatorios", icon: BarChart3 },
    ],
  },
];

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center gap-2 px-5", collapsed && "justify-center px-0")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">N</div>
        {!collapsed && <span className="text-base font-semibold tracking-tight">NexoDesk</span>}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2 scrollbar-thin">
        {NAV_GROUPS.map((group, i) => (
          <div key={i} className="space-y-1">
            {group.label && !collapsed && <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">{group.label}</p>}
            {group.items.map((item) => (
              <SidebarLink key={item.to} item={item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 p-3">
        <NavLink
          to="/configuracoes"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-hover",
              isActive && "bg-sidebar-active/15 text-white",
              collapsed && "justify-center px-0",
            )
          }
        >
          <Settings className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && "Configurações"}
        </NavLink>

        <button
          onClick={toggleSidebar}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
        >
          {collapsed ? <ChevronsRight className="h-[18px] w-[18px]" /> : <ChevronsLeft className="h-[18px] w-[18px]" />}
          {!collapsed && "Recolher"}
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const link = (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-hover hover:text-white",
          isActive && "bg-sidebar-active/90 text-white shadow-soft hover:bg-sidebar-active",
          collapsed && "justify-center px-0",
        )
      }
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && item.label}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
