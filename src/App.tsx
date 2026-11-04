import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'
import Ask from '@/pages/Ask'
import { TasksPage } from '@/pages/vendas-pro/TasksPage'
import { LeadsPage } from '@/pages/vendas-pro/LeadsPage'
import { ContractsPage } from '@/pages/vendas-pro/ContractsPage'
import { SalesPage } from '@/pages/vendas-pro/SalesPage'
import { ResultsPage } from '@/pages/vendas-pro/ResultsPage'
import { CommissionsPage } from '@/pages/vendas-pro/CommissionsPage'
import { ChannelsPage } from '@/pages/channels/ChannelsPage'
import { ChannelTypeSelectionPage } from '@/pages/channels/ChannelTypeSelectionPage'
import { ChannelFormPage } from '@/pages/channels/ChannelFormPage'
import { InboxPage } from '@/pages/channels/InboxPage'
import ConfirmEmailChange from '@/pages/ConfirmEmailChange'
import Campaigns from '@/pages/Campaigns'
import CaptureForms from '@/pages/CaptureForms'
import Contacts from '@/pages/Contacts'
import Deals from '@/pages/Deals'
import Empresas from '@/pages/Empresas'
import ForgotPassword from '@/pages/ForgotPassword'
import Index from '@/pages/Index'
import LeadCapture from '@/pages/LeadCapture'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import Pipeline from '@/pages/Pipeline'
import Recovery from '@/pages/Recovery'
import ResetPassword from '@/pages/ResetPassword'
import Settings from '@/pages/Settings'
import Signup from '@/pages/Signup'
import VerifyEmail from '@/pages/VerifyEmail'

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <AuthProvider>
          <OrganizationProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/captura" element={<LeadCapture />} />
              <Route path="/form/:id" element={<LeadCapture />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route index element={<Navigate to="/ask" replace />} />
                  <Route path="ask" element={<Ask />} />
                  <Route path="dashboard" element={<Index />} />
                  <Route path="pipeline" element={<Pipeline />} />
                  <Route path="recuperacao" element={<Recovery />} />
                  <Route path="negocios" element={<Deals />} />
                  <Route path="contatos" element={<Contacts />} />
                  <Route path="empresas" element={<Empresas />} />
                  <Route path="campanhas" element={<Campaigns />} />
                  <Route path="formularios" element={<CaptureForms />} />
                  <Route path="embed" element={<Navigate to="/formularios" replace />} />
                  <Route path="vendas-pro/tarefas" element={<TasksPage />} />
                  <Route path="vendas-pro/leads" element={<LeadsPage />} />
                  <Route path="vendas-pro/contratos" element={<ContractsPage />} />
                  <Route path="vendas-pro/vendas" element={<SalesPage />} />
                  <Route path="vendas-pro/resultados" element={<ResultsPage />} />
                  <Route path="vendas-pro/comissoes" element={<CommissionsPage />} />
                  <Route path="channels" element={<ChannelsPage />} />
                  <Route path="channels/new" element={<ChannelTypeSelectionPage />} />
                  <Route path="channels/new/form" element={<ChannelFormPage />} />
                  <Route path="channels/:id/edit" element={<ChannelFormPage />} />
                  <Route path="inbox" element={<InboxPage />} />
                  <Route path="configuracoes" element={<Settings />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </OrganizationProvider>
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  )
}
