import { useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClienteForm } from "@/components/Clientes/ClienteForm";
import { ProcessoForm } from "@/components/Processos/ProcessoForm";
import { PrazoForm } from "@/components/Prazos/PrazoForm";
import { useDeadlineCheck } from "@/hooks/useDeadlineCheck";
import { useDashboard } from "@/hooks/queries/useDashboardQuery";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { queryKeys } from "@/hooks/queries/queryKeys";
import {
  FileText,
  Users,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const [clienteFormOpen, setClienteFormOpen]   = useState(false);
  const [processoFormOpen, setProcessoFormOpen] = useState(false);
  const [prazoFormOpen, setPrazoFormOpen]       = useState(false);

  const { user }       = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient    = useQueryClient();
  const { data, isLoading } = useDashboard();

  // Automatic deadline check on first app access of the day
  useDeadlineCheck();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? '') });
  };

  const stats           = data?.stats;
  const upcomingPrazos  = data?.upcomingPrazos  ?? [];
  const recentActivities = data?.recentActivities ?? [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da sua gestão jurídica</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))
          ) : (
            <>
              <StatsCard
                title="Processos Ativos"
                value={stats?.processosAtivos ?? 0}
                icon={FileText}
                variant="default"
              />
              <StatsCard
                title="Clientes Ativos"
                value={stats?.clientesAtivos ?? 0}
                icon={Users}
                variant="success"
              />
              <StatsCard
                title="Prazos Próximos"
                value={stats?.prazosProximos ?? 0}
                icon={Calendar}
                trend={{ value: "próximos 7 dias", isPositive: false }}
                variant="warning"
              />
              <StatsCard
                title="Prazos Críticos"
                value={stats?.prazosCriticos ?? 0}
                icon={AlertCircle}
                trend={{ value: "< 3 dias", isPositive: false }}
                variant="destructive"
              />
            </>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Deadlines */}
          <Card className="p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Prazos Próximos</h2>
            </div>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))
              ) : upcomingPrazos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum prazo próximo</p>
              ) : (
                upcomingPrazos.map((prazo) => (
                  <div
                    key={prazo.id}
                    className="flex items-start gap-4 rounded-lg border border-border bg-gradient-card p-4 transition-shadow hover:shadow-sm"
                  >
                    <div
                      className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full ${
                        prazo.priority === "high"
                          ? "bg-destructive/10 text-destructive"
                          : prazo.priority === "medium"
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                      }`}
                    >
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground">{prazo.titulo}</p>
                          <p className="text-sm text-muted-foreground">{prazo.clientName}</p>
                        </div>
                        <Badge variant={prazo.priority === "high" ? "destructive" : "secondary"}>
                          {prazo.daysLeft}d
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Vencimento: {new Date(prazo.data).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Atividades Recentes</h2>
            </div>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))
              ) : recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
              ) : (
                recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 rounded-lg border border-border bg-gradient-card p-4"
                  >
                    <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-foreground">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.time), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Ações Rápidas</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Button
              className="h-auto flex-col gap-2 py-6"
              onClick={() => setClienteFormOpen(true)}
            >
              <Users className="h-6 w-6" />
              <span>Novo Cliente</span>
            </Button>
            <Button
              className="h-auto flex-col gap-2 py-6"
              onClick={() => setProcessoFormOpen(true)}
            >
              <FileText className="h-6 w-6" />
              <span>Novo Processo</span>
            </Button>
            <Button
              className="h-auto flex-col gap-2 py-6"
              onClick={() => setPrazoFormOpen(true)}
            >
              <Calendar className="h-6 w-6" />
              <span>Novo Prazo</span>
            </Button>
          </div>
        </Card>
      </div>

      <ClienteForm
        open={clienteFormOpen}
        onOpenChange={setClienteFormOpen}
        onSuccess={invalidate}
      />
      <ProcessoForm
        open={processoFormOpen}
        onOpenChange={setProcessoFormOpen}
        onSuccess={invalidate}
      />
      <PrazoForm
        open={prazoFormOpen}
        onOpenChange={setPrazoFormOpen}
        onSuccess={invalidate}
      />
    </MainLayout>
  );
}
