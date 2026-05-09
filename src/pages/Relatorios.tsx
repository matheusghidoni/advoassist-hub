import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { subMonths, format, startOfMonth, endOfMonth, isWithinInterval, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  BarChart2,
} from "lucide-react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHonorarios } from "@/hooks/queries/useHonorariosQuery";
import { useProcessos } from "@/hooks/queries/useProcessosQuery";
import { usePrazos } from "@/hooks/queries/usePrazosQuery";

// ── Paleta de cores ──────────────────────────────────────────────────────────

const COLORS = {
  primary:     "#6366f1",
  success:     "#22c55e",
  warning:     "#f59e0b",
  danger:      "#ef4444",
  info:        "#3b82f6",
  muted:       "#94a3b8",
  purple:      "#a855f7",
  teal:        "#14b8a6",
};

const STATUS_PROCESSO_COLORS: Record<string, string> = {
  em_andamento: COLORS.primary,
  suspenso:     COLORS.warning,
  concluido:    COLORS.success,
  arquivado:    COLORS.muted,
};

const STATUS_HONORARIO_COLORS: Record<string, string> = {
  pago:     COLORS.success,
  parcial:  COLORS.warning,
  pendente: COLORS.danger,
};

// ── Formatadores ─────────────────────────────────────────────────────────────

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const pct = (v: number, total: number) =>
  total === 0 ? "0%" : `${Math.round((v / total) * 100)}%`;

// ── Tooltip customizado (financeiro) ─────────────────────────────────────────

function TooltipBRL({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {brl(p.value)}
        </p>
      ))}
    </div>
  );
}

function TooltipSimples({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ── Componente de KPI ─────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  loading: boolean;
}

function KpiCard({ label, value, sub, icon: Icon, color, loading }: KpiCardProps) {
  return (
    <Card className="p-5 shadow-card">
      {loading ? (
        <Skeleton className="h-16" />
      ) : (
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Utilitário: últimos N meses ───────────────────────────────────────────────

function lastMonths(n: number) {
  return Array.from({ length: n }, (_, i) => subMonths(new Date(), n - 1 - i));
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function Relatorios() {
  const { data: honorarios = [], isLoading: loadingH } = useHonorarios();
  const { data: processos  = [], isLoading: loadingP } = useProcessos();
  const { data: prazos     = [], isLoading: loadingPz } = usePrazos();
  const loading = loadingH || loadingP || loadingPz;

  // ── KPIs financeiros ────────────────────────────────────────────────────────

  const totalContratado = useMemo(() => honorarios.reduce((s, h) => s + (h.valor_total ?? 0), 0), [honorarios]);
  const totalRecebido   = useMemo(() => honorarios.reduce((s, h) => s + (h.valor_pago ?? 0), 0), [honorarios]);
  const totalPendente   = useMemo(() =>
    honorarios
      .filter((h) => h.status !== "pago")
      .reduce((s, h) => s + ((h.valor_total ?? 0) - (h.valor_pago ?? 0)), 0),
  [honorarios]);
  const honorariosVencidos = useMemo(() =>
    honorarios.filter((h) =>
      h.status !== "pago" &&
      h.data_vencimento &&
      isPast(new Date(h.data_vencimento)) &&
      !isToday(new Date(h.data_vencimento)),
    ).length,
  [honorarios]);

  // ── KPIs de prazos ──────────────────────────────────────────────────────────

  const totalPrazos     = prazos.length;
  const concluidos      = prazos.filter((p) => p.concluido).length;
  const taxaCumprimento = totalPrazos === 0 ? 0 : Math.round((concluidos / totalPrazos) * 100);
  const prazosVencidos  = prazos.filter(
    (p) => !p.concluido && isPast(new Date(p.data)) && !isToday(new Date(p.data)),
  ).length;

  // ── Receita mensal (últimos 6 meses) ────────────────────────────────────────

  const receitaMensal = useMemo(() => {
    return lastMonths(6).map((mes) => {
      const inicio = startOfMonth(mes);
      const fim    = endOfMonth(mes);
      const domes  = honorarios.filter((h) => {
        const ref = h.data_vencimento ?? h.created_at;
        return isWithinInterval(new Date(ref), { start: inicio, end: fim });
      });
      return {
        mes:          format(mes, "MMM/yy", { locale: ptBR }),
        "Contratado": Math.round(domes.reduce((s, h) => s + (h.valor_total ?? 0), 0)),
        "Recebido":   Math.round(domes.reduce((s, h) => s + (h.valor_pago ?? 0), 0)),
      };
    });
  }, [honorarios]);

  // ── Status dos honorários (pizza) ───────────────────────────────────────────

  const statusHonorarios = useMemo(() => {
    const counts: Record<string, number> = { pago: 0, parcial: 0, pendente: 0 };
    honorarios.forEach((h) => { counts[h.status] = (counts[h.status] ?? 0) + 1; });
    return [
      { name: "Pago",     value: counts.pago,     fill: STATUS_HONORARIO_COLORS.pago },
      { name: "Parcial",  value: counts.parcial,  fill: STATUS_HONORARIO_COLORS.parcial },
      { name: "Pendente", value: counts.pendente, fill: STATUS_HONORARIO_COLORS.pendente },
    ].filter((d) => d.value > 0);
  }, [honorarios]);

  // ── Status dos processos (pizza) ─────────────────────────────────────────────

  const statusProcessos = useMemo(() => {
    const labels: Record<string, string> = {
      em_andamento: "Em andamento",
      suspenso:     "Suspenso",
      concluido:    "Concluído",
      arquivado:    "Arquivado",
    };
    const counts: Record<string, number> = {};
    processos.forEach((p) => { counts[p.status] = (counts[p.status] ?? 0) + 1; });
    return Object.entries(counts).map(([key, value]) => ({
      name:  labels[key] ?? key,
      value,
      fill:  STATUS_PROCESSO_COLORS[key] ?? COLORS.muted,
    }));
  }, [processos]);

  // ── Prazos por mês: cumpridos vs pendentes (últimos 6 meses) ────────────────

  const prazosMensais = useMemo(() => {
    return lastMonths(6).map((mes) => {
      const inicio = startOfMonth(mes);
      const fim    = endOfMonth(mes);
      const domes  = prazos.filter((p) =>
        isWithinInterval(new Date(p.data + "T12:00:00"), { start: inicio, end: fim }),
      );
      return {
        mes:         format(mes, "MMM/yy", { locale: ptBR }),
        "Cumpridos": domes.filter((p) => p.concluido).length,
        "Pendentes": domes.filter((p) => !p.concluido).length,
      };
    });
  }, [prazos]);

  // ── Processos por tipo (top 6) ───────────────────────────────────────────────

  const processosPorTipo = useMemo(() => {
    const counts: Record<string, number> = {};
    processos.forEach((p) => { counts[p.tipo] = (counts[p.tipo] ?? 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tipo, total]) => ({ tipo, total }));
  }, [processos]);

  // ── Honorários por tipo de pagamento (pizza) ─────────────────────────────────

  const honorariosPorTipo = useMemo(() => {
    const counts: Record<string, number> = {};
    honorarios.forEach((h) => { counts[h.tipo_pagamento] = (counts[h.tipo_pagamento] ?? 0) + 1; });
    const palette = [COLORS.primary, COLORS.info, COLORS.teal];
    const labels: Record<string, string> = { a_vista: "À vista", parcelado: "Parcelado" };
    return Object.entries(counts).map(([key, value], i) => ({
      name:  labels[key] ?? key,
      value,
      fill:  palette[i % palette.length],
    }));
  }, [honorarios]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className="space-y-8">

        {/* Cabeçalho */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Visão analítica do escritório</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total contratado"
            value={brl(totalContratado)}
            sub={`${honorarios.length} honorário(s)`}
            icon={DollarSign}
            color="bg-primary/10 text-primary"
            loading={loading}
          />
          <KpiCard
            label="Total recebido"
            value={brl(totalRecebido)}
            sub={pct(totalRecebido, totalContratado) + " do contratado"}
            icon={TrendingUp}
            color="bg-success/10 text-success"
            loading={loading}
          />
          <KpiCard
            label="A receber"
            value={brl(totalPendente)}
            sub={honorariosVencidos > 0 ? `${honorariosVencidos} vencido(s)` : "Nenhum vencido"}
            icon={AlertCircle}
            color={honorariosVencidos > 0 ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}
            loading={loading}
          />
          <KpiCard
            label="Cumprimento de prazos"
            value={`${taxaCumprimento}%`}
            sub={`${concluidos} de ${totalPrazos} • ${prazosVencidos} vencido(s)`}
            icon={CheckCircle2}
            color={taxaCumprimento >= 80 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}
            loading={loading}
          />
        </div>

        {/* Bloco financeiro */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Financeiro
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Receita mensal — 2/3 da largura */}
            <Card className="p-5 shadow-card lg:col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-4">
                Contratado vs Recebido — últimos 6 meses
              </p>
              {loading ? (
                <Skeleton className="h-56" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={receitaMensal} barCategoryGap="30%" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                    />
                    <Tooltip content={<TooltipBRL />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Contratado" fill={COLORS.primary}  radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Recebido"   fill={COLORS.success}  radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Status dos honorários — pizza */}
            <Card className="p-5 shadow-card">
              <p className="text-sm font-medium text-muted-foreground mb-4">
                Status dos honorários
              </p>
              {loading ? (
                <Skeleton className="h-56" />
              ) : statusHonorarios.length === 0 ? (
                <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                  Nenhum honorário cadastrado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusHonorarios}
                      cx="50%"
                      cy="45%"
                      outerRadius={75}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusHonorarios.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, "Honorários"]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Tipo de pagamento */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5 shadow-card">
              <p className="text-sm font-medium text-muted-foreground mb-4">
                Tipo de pagamento
              </p>
              {loading ? (
                <Skeleton className="h-44" />
              ) : honorariosPorTipo.length === 0 ? (
                <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                  Sem dados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={honorariosPorTipo}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {honorariosPorTipo.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, "Honorários"]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Resumo financeiro textual */}
            <Card className="p-5 shadow-card lg:col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-4">Resumo financeiro</p>
              {loading ? (
                <Skeleton className="h-44" />
              ) : (
                <div className="grid grid-cols-2 gap-4 h-44 content-center">
                  {[
                    {
                      label: "Honorários pagos",
                      value: honorarios.filter((h) => h.status === "pago").length,
                      total: honorarios.length,
                      color: "text-success",
                    },
                    {
                      label: "Parcialmente pagos",
                      value: honorarios.filter((h) => h.status === "parcial").length,
                      total: honorarios.length,
                      color: "text-warning",
                    },
                    {
                      label: "Pendentes",
                      value: honorarios.filter((h) => h.status === "pendente").length,
                      total: honorarios.length,
                      color: "text-destructive",
                    },
                    {
                      label: "Parcelados ativos",
                      value: honorarios.filter((h) => h.tipo_pagamento === "parcelado" && h.status !== "pago").length,
                      total: honorarios.length,
                      color: "text-info",
                    },
                  ].map(({ label, value, total, color }) => (
                    <div key={label} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-muted-foreground">{pct(value, total)} do total</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </section>

        {/* Bloco de processos */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Processos
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status dos processos — pizza */}
            <Card className="p-5 shadow-card">
              <p className="text-sm font-medium text-muted-foreground mb-4">
                Distribuição por status
              </p>
              {loading ? (
                <Skeleton className="h-56" />
              ) : statusProcessos.length === 0 ? (
                <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                  Nenhum processo cadastrado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusProcessos}
                      cx="50%"
                      cy="45%"
                      outerRadius={75}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusProcessos.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [v, name]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Processos por tipo — barras */}
            <Card className="p-5 shadow-card lg:col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-4">
                Top tipos de processo
              </p>
              {loading ? (
                <Skeleton className="h-56" />
              ) : processosPorTipo.length === 0 ? (
                <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                  Sem dados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={processosPorTipo} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      dataKey="tipo"
                      type="category"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={130}
                    />
                    <Tooltip content={<TooltipSimples />} />
                    <Bar dataKey="total" name="Processos" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </section>

        {/* Bloco de prazos */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Prazos
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cumprimento mensal — barras empilhadas */}
            <Card className="p-5 shadow-card lg:col-span-2">
              <p className="text-sm font-medium text-muted-foreground mb-4">
                Cumprimento de prazos — últimos 6 meses
              </p>
              {loading ? (
                <Skeleton className="h-56" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={prazosMensais} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                    <Tooltip content={<TooltipSimples />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Cumpridos" stackId="a" fill={COLORS.success} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Pendentes" stackId="a" fill={COLORS.warning}  radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Indicadores de prazo */}
            <Card className="p-5 shadow-card">
              <p className="text-sm font-medium text-muted-foreground mb-4">Indicadores</p>
              {loading ? (
                <Skeleton className="h-56" />
              ) : (
                <div className="space-y-4 pt-2">
                  {[
                    {
                      label: "Taxa de cumprimento",
                      value: `${taxaCumprimento}%`,
                      color: taxaCumprimento >= 80 ? "text-success" : taxaCumprimento >= 60 ? "text-warning" : "text-destructive",
                      bar:   taxaCumprimento,
                      barColor: taxaCumprimento >= 80 ? "bg-success" : taxaCumprimento >= 60 ? "bg-warning" : "bg-destructive",
                    },
                    {
                      label: "Concluídos",
                      value: String(concluidos),
                      color: "text-success",
                      bar:   totalPrazos === 0 ? 0 : (concluidos / totalPrazos) * 100,
                      barColor: "bg-success",
                    },
                    {
                      label: "Pendentes",
                      value: String(totalPrazos - concluidos),
                      color: "text-warning",
                      bar:   totalPrazos === 0 ? 0 : ((totalPrazos - concluidos) / totalPrazos) * 100,
                      barColor: "bg-warning",
                    },
                    {
                      label: "Vencidos sem conclusão",
                      value: String(prazosVencidos),
                      color: "text-destructive",
                      bar:   totalPrazos === 0 ? 0 : (prazosVencidos / totalPrazos) * 100,
                      barColor: "bg-destructive",
                    },
                  ].map(({ label, value, color, bar, barColor }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className={`text-sm font-semibold ${color}`}>{value}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all`}
                          style={{ width: `${Math.min(bar, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </section>

      </div>
    </MainLayout>
  );
}
