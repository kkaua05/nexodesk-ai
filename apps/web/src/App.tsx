import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { RequireAuth } from "@/components/layout/require-auth";
import { LoginPage } from "@/pages/login-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { WhatsappInboxPage } from "@/pages/whatsapp/inbox-page";
import { LeadsPage } from "@/pages/crm/leads-page";
import { PipelinePage } from "@/pages/crm/pipeline-page";
import { CustomersPage } from "@/pages/crm/customers-page";
import { CustomerDetailPage } from "@/pages/crm/customer-detail-page";
import { ProjectsPage } from "@/pages/projects/projects-page";
import { ProjectDetailPage } from "@/pages/projects/project-detail-page";
import { FinancePage } from "@/pages/finance/finance-page";
import { AgendaPage } from "@/pages/agenda/agenda-page";
import { ProposalsPage } from "@/pages/proposals/proposals-page";
import { AutomationsPage } from "@/pages/automations/automations-page";
import { NexoAiPage } from "@/pages/nexo-ai/nexo-ai-page";
import { ReportsPage } from "@/pages/reports/reports-page";
import { SettingsPage } from "@/pages/settings/settings-page";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/whatsapp" element={<WhatsappInboxPage />} />
        <Route path="/crm/leads" element={<LeadsPage />} />
        <Route path="/crm/pipeline" element={<PipelinePage />} />
        <Route path="/crm/clientes" element={<CustomersPage />} />
        <Route path="/crm/clientes/:id" element={<CustomerDetailPage />} />
        <Route path="/projetos" element={<ProjectsPage />} />
        <Route path="/projetos/:id" element={<ProjectDetailPage />} />
        <Route path="/financeiro" element={<FinancePage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/propostas" element={<ProposalsPage />} />
        <Route path="/automacoes" element={<AutomationsPage />} />
        <Route path="/nexo-ai" element={<NexoAiPage />} />
        <Route path="/relatorios" element={<ReportsPage />} />
        <Route path="/configuracoes/*" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
