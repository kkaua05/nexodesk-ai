import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CompanySettings } from "./company-settings";
import { IntegrationsSettings } from "./integrations-settings";
import { AiSettings } from "./ai-settings";
import { UsersSettings } from "./users-settings";

const TABS = [
  { to: "/configuracoes/empresa", label: "Empresa" },
  { to: "/configuracoes/usuarios", label: "Usuários" },
  { to: "/configuracoes/integracoes", label: "Integrações" },
  { to: "/configuracoes/ia", label: "IA" },
];

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Empresa, usuários, integrações e inteligência artificial.</p>
      </div>

      <div className="flex gap-1 border-b border-border/60">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn("px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground", isActive && "border-b-2 border-primary text-foreground")
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<Navigate to="empresa" replace />} />
        <Route path="empresa" element={<CompanySettings />} />
        <Route path="usuarios" element={<UsersSettings />} />
        <Route path="integracoes" element={<IntegrationsSettings />} />
        <Route path="ia" element={<AiSettings />} />
      </Routes>
    </div>
  );
}
