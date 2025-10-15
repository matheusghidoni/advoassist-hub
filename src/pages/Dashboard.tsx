import { MainLayout } from "@/components/Layout/MainLayout";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Users, 
  Calendar, 
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2
} from "lucide-react";

export default function Dashboard() {
  const upcomingDeadlines = [
    { id: 1, title: "Petição Inicial - Silva vs. Santos", client: "João Silva", date: "2025-10-17", daysLeft: 2, priority: "high" },
    { id: 2, title: "Recurso - Processo 123456", client: "Maria Santos", date: "2025-10-20", daysLeft: 5, priority: "medium" },
    { id: 3, title: "Audiência - Trabalhista", client: "Pedro Costa", date: "2025-10-22", daysLeft: 7, priority: "low" },
  ];

  const recentActivity = [
    { id: 1, action: "Novo processo cadastrado", details: "Processo 7654321-12.2025.8.26.0100", time: "2 horas atrás" },
    { id: 2, action: "Documento enviado", details: "Petição inicial - Silva vs. Santos", time: "5 horas atrás" },
    { id: 3, action: "Cliente cadastrado", details: "Ana Oliveira - CPF 123.456.789-00", time: "1 dia atrás" },
  ];

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
          <StatsCard
            title="Processos Ativos"
            value={24}
            icon={FileText}
            trend={{ value: "+3 este mês", isPositive: true }}
            variant="default"
          />
          <StatsCard
            title="Clientes Ativos"
            value={18}
            icon={Users}
            trend={{ value: "+2 este mês", isPositive: true }}
            variant="success"
          />
          <StatsCard
            title="Prazos Próximos"
            value={7}
            icon={Calendar}
            trend={{ value: "próximos 7 dias", isPositive: false }}
            variant="warning"
          />
          <StatsCard
            title="Prazos Críticos"
            value={3}
            icon={AlertCircle}
            trend={{ value: "< 3 dias", isPositive: false }}
            variant="destructive"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Deadlines */}
          <Card className="p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Prazos Próximos</h2>
              <Button variant="ghost" size="sm">Ver todos</Button>
            </div>
            <div className="space-y-4">
              {upcomingDeadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className="flex items-start gap-4 rounded-lg border border-border bg-gradient-card p-4 transition-shadow hover:shadow-sm"
                >
                  <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full ${
                    deadline.priority === 'high' 
                      ? 'bg-destructive/10 text-destructive' 
                      : deadline.priority === 'medium'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-success/10 text-success'
                  }`}>
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{deadline.title}</p>
                        <p className="text-sm text-muted-foreground">{deadline.client}</p>
                      </div>
                      <Badge variant={deadline.priority === 'high' ? 'destructive' : 'secondary'}>
                        {deadline.daysLeft}d
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vencimento: {new Date(deadline.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Atividades Recentes</h2>
              <Button variant="ghost" size="sm">Ver todas</Button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
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
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Ações Rápidas</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Button className="h-auto flex-col gap-2 py-6">
              <Users className="h-6 w-6" />
              <span>Novo Cliente</span>
            </Button>
            <Button className="h-auto flex-col gap-2 py-6">
              <FileText className="h-6 w-6" />
              <span>Novo Processo</span>
            </Button>
            <Button className="h-auto flex-col gap-2 py-6">
              <Calendar className="h-6 w-6" />
              <span>Novo Prazo</span>
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
