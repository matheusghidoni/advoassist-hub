import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Processos from "./pages/Processos";
import Prazos from "./pages/Prazos";
import Financeiro from "./pages/Financeiro";
import Notificacoes from "./pages/Notificacoes";
import Configuracoes from "./pages/Configuracoes";
import Profile from "./pages/Profile";
import Relatorios from "./pages/Relatorios";
import Tarefas from "./pages/Tarefas";
import Timesheet from "./pages/Timesheet";
import Equipe from "./pages/Equipe";
import AceitarConvite from "./pages/AceitarConvite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WorkspaceProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login"           element={<Login />} />
              <Route path="/register"        element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password"  element={<ResetPassword />} />

              {/* Protected routes */}
              <Route path="/"              element={<ProtectedRoute><ErrorBoundary><Dashboard /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/clientes"      element={<ProtectedRoute><ErrorBoundary><Clientes /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/processos"     element={<ProtectedRoute><ErrorBoundary><Processos /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/prazos"        element={<ProtectedRoute><ErrorBoundary><Prazos /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/financeiro"    element={<ProtectedRoute><ErrorBoundary><Financeiro /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/notificacoes"  element={<ProtectedRoute><ErrorBoundary><Notificacoes /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><ErrorBoundary><Configuracoes /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/relatorios"    element={<ProtectedRoute><ErrorBoundary><Relatorios /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/tarefas"       element={<ProtectedRoute><ErrorBoundary><Tarefas /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/timesheet"     element={<ProtectedRoute><ErrorBoundary><Timesheet /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/equipe"        element={<ProtectedRoute><ErrorBoundary><Equipe /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/aceitar-convite/:token" element={<AceitarConvite />} />
              <Route path="/perfil"        element={<ProtectedRoute><ErrorBoundary><Profile /></ErrorBoundary></ProtectedRoute>} />

              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WorkspaceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
