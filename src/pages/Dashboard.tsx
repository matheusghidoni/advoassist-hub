import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { StatsCard } from "@/components/Dashboard/StatsCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClienteForm } from "@/components/Clientes/ClienteForm";
import { ProcessoForm } from "@/components/Processos/ProcessoForm";
import { PrazoForm } from "@/components/Prazos/PrazoForm";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Users, 
  Calendar, 
  AlertCircle,
  Clock,
  CheckCircle2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const [clienteFormOpen, setClienteFormOpen] = useState(false);
  const [processoFormOpen, setProcessoFormOpen] = useState(false);
  const [prazoFormOpen, setPrazoFormOpen] = useState(false);
  
  const [stats, setStats] = useState({
    processosAtivos: 0,
    clientesAtivos: 0,
    prazosProximos: 0,
    prazosCriticos: 0,
  });
  
  const [prazos, setPrazos] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch stats
    const { data: processos } = await supabase
      .from("processos")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "em_andamento");

    const { data: clientes } = await supabase
      .from("clientes")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "ativo");

    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const { data: prazosProximos } = await supabase
      .from("prazos")
      .select("*")
      .eq("user_id", user.id)
      .eq("concluido", false)
      .gte("data", today.toISOString().split('T')[0])
      .lte("data", sevenDaysFromNow.toISOString().split('T')[0]);

    const { data: prazosCriticos } = await supabase
      .from("prazos")
      .select("*")
      .eq("user_id", user.id)
      .eq("concluido", false)
      .gte("data", today.toISOString().split('T')[0])
      .lte("data", threeDaysFromNow.toISOString().split('T')[0]);

    setStats({
      processosAtivos: processos?.length || 0,
      clientesAtivos: clientes?.length || 0,
      prazosProximos: prazosProximos?.length || 0,
      prazosCriticos: prazosCriticos?.length || 0,
    });

    // Fetch upcoming deadlines
    const { data: upcomingPrazos } = await supabase
      .from("prazos")
      .select("*, processos(numero, clientes(nome))")
      .eq("user_id", user.id)
      .eq("concluido", false)
      .gte("data", today.toISOString().split('T')[0])
      .order("data", { ascending: true })
      .limit(5);

    if (upcomingPrazos) {
      setPrazos(upcomingPrazos.map((prazo: any) => {
        const prazoDate = new Date(prazo.data + 'T00:00:00');
        const diffTime = prazoDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let priority = "low";
        if (daysLeft <= 3) priority = "high";
        else if (daysLeft <= 5) priority = "medium";
        
        return {
          ...prazo,
          daysLeft,
          priority,
          clientName: prazo.processos?.clientes?.nome || "Sem cliente",
        };
      }));
    }

    // Fetch recent activity
    const recentActivities: any[] = [];

    const { data: recentProcessos } = await supabase
      .from("processos")
      .select("*, clientes(nome)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    const { data: recentClientes } = await supabase
      .from("clientes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    const { data: recentPrazos } = await supabase
      .from("prazos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (recentProcessos) {
      recentProcessos.forEach((processo: any) => {
        recentActivities.push({
          id: `processo-${processo.id}`,
          action: "Novo processo cadastrado",
          details: processo.numero,
          time: processo.created_at,
        });
      });
    }

    if (recentClientes) {
      recentClientes.forEach((cliente: any) => {
        recentActivities.push({
          id: `cliente-${cliente.id}`,
          action: "Cliente cadastrado",
          details: `${cliente.nome} - CPF ${cliente.cpf}`,
          time: cliente.created_at,
        });
      });
    }

    if (recentPrazos) {
      recentPrazos.forEach((prazo: any) => {
        recentActivities.push({
          id: `prazo-${prazo.id}`,
          action: "Prazo cadastrado",
          details: prazo.titulo,
          time: prazo.created_at,
        });
      });
    }

    // Sort by time and limit to 5
    recentActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setAtividades(recentActivities.slice(0, 5));
  };

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
            value={stats.processosAtivos}
            icon={FileText}
            variant="default"
          />
          <StatsCard
            title="Clientes Ativos"
            value={stats.clientesAtivos}
            icon={Users}
            variant="success"
          />
          <StatsCard
            title="Prazos Próximos"
            value={stats.prazosProximos}
            icon={Calendar}
            trend={{ value: "próximos 7 dias", isPositive: false }}
            variant="warning"
          />
          <StatsCard
            title="Prazos Críticos"
            value={stats.prazosCriticos}
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
            </div>
            <div className="space-y-4">
              {prazos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum prazo próximo</p>
              ) : (
                prazos.map((prazo) => (
                  <div
                    key={prazo.id}
                    className="flex items-start gap-4 rounded-lg border border-border bg-gradient-card p-4 transition-shadow hover:shadow-sm"
                  >
                    <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full ${
                      prazo.priority === 'high' 
                        ? 'bg-destructive/10 text-destructive' 
                        : prazo.priority === 'medium'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-success/10 text-success'
                    }`}>
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-foreground">{prazo.titulo}</p>
                          <p className="text-sm text-muted-foreground">{prazo.clientName}</p>
                        </div>
                        <Badge variant={prazo.priority === 'high' ? 'destructive' : 'secondary'}>
                          {prazo.daysLeft}d
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Vencimento: {new Date(prazo.data).toLocaleDateString('pt-BR')}
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
              {atividades.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
              ) : (
                atividades.map((activity) => (
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
                        {formatDistanceToNow(new Date(activity.time), { addSuffix: true, locale: ptBR })}
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
            <Button className="h-auto flex-col gap-2 py-6" onClick={() => setClienteFormOpen(true)}>
              <Users className="h-6 w-6" />
              <span>Novo Cliente</span>
            </Button>
            <Button className="h-auto flex-col gap-2 py-6" onClick={() => setProcessoFormOpen(true)}>
              <FileText className="h-6 w-6" />
              <span>Novo Processo</span>
            </Button>
            <Button className="h-auto flex-col gap-2 py-6" onClick={() => setPrazoFormOpen(true)}>
              <Calendar className="h-6 w-6" />
              <span>Novo Prazo</span>
            </Button>
          </div>
        </Card>
      </div>

      <ClienteForm 
        open={clienteFormOpen} 
        onOpenChange={setClienteFormOpen} 
        onSuccess={fetchDashboardData} 
      />
      <ProcessoForm 
        open={processoFormOpen} 
        onOpenChange={setProcessoFormOpen} 
        onSuccess={fetchDashboardData} 
      />
      <PrazoForm 
        open={prazoFormOpen} 
        onOpenChange={setPrazoFormOpen} 
        onSuccess={fetchDashboardData} 
      />
    </MainLayout>
  );
}
