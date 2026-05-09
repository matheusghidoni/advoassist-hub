import { useMemo, useState } from "react";
import {
  Timer,
  Plus,
  Search,
  Pencil,
  Trash2,
  Clock,
  TrendingUp,
  DollarSign,
  CalendarDays,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  BarChart2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { RegistroHorasForm } from "@/components/Timesheet/RegistroHorasForm";
import {
  useRegistrosHoras,
  useDeleteRegistroHoras,
  calcularStats,
  formatarHoras,
  type RegistroHoras,
} from "@/hooks/queries/useTimesheetQuery";

// ── Constantes ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function getMonthKey(date: Date) {
  return format(date, "yyyy-MM");
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon:       React.ElementType;
  label:      string;
  value:      string;
  sub?:       string;
  colorClass: string;
}

function KpiCard({ icon: Icon, label, value, sub, colorClass }: KpiCardProps) {
  return (
    <Card className="p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

// ── Linha de registro ─────────────────────────────────────────────────────────

interface RegistroRowProps {
  registro:  RegistroHoras;
  onEdit:    (r: RegistroHoras) => void;
  onDelete:  (r: RegistroHoras) => void;
}

function RegistroRow({ registro, onEdit, onDelete }: RegistroRowProps) {
  const totalValor =
    registro.valor_hora != null
      ? Number(registro.horas) * Number(registro.valor_hora)
      : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
      {/* Data */}
      <div className="w-[88px] shrink-0 text-center">
        <p className="text-sm font-semibold text-foreground">
          {format(new Date(registro.data + "T12:00:00"), "dd MMM", { locale: ptBR })}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {format(new Date(registro.data + "T12:00:00"), "yyyy")}
        </p>
      </div>

      {/* Descrição + vínculos */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{registro.descricao}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {registro.processos && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <FileText className="h-3 w-3" />
              {registro.processos.numero}
            </span>
          )}
          {registro.clientes && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" />
              {registro.clientes.nome}
            </span>
          )}
          {!registro.processos && !registro.clientes && (
            <span className="text-[11px] text-muted-foreground">Sem vínculo</span>
          )}
        </div>
      </div>

      {/* Horas */}
      <div className="w-[76px] shrink-0 text-right">
        <Badge variant="secondary" className="font-mono text-xs">
          {formatarHoras(Number(registro.horas))}
        </Badge>
      </div>

      {/* Valor */}
      <div className="w-[100px] shrink-0 text-right">
        {totalValor != null ? (
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(totalValor)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1 shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(registro)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(registro)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// ── Gráfico de horas por dia (mês selecionado) ────────────────────────────────

interface HorasPorDiaChartProps {
  registros: RegistroHoras[];
  month:     Date;
}

function HorasPorDiaChart({ registros, month }: HorasPorDiaChartProps) {
  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end:   endOfMonth(month),
  });

  const data = days.map((day) => {
    const key    = format(day, "yyyy-MM-dd");
    const horas  = registros
      .filter((r) => r.data === key)
      .reduce((acc, r) => acc + Number(r.horas), 0);
    return { day: format(day, "dd"), horas };
  });

  const max = Math.max(...data.map((d) => d.horas), 1);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10 }}
          interval={2}
          className="text-muted-foreground"
        />
        <YAxis tick={{ fontSize: 10 }} domain={[0, Math.ceil(max + 1)]} className="text-muted-foreground" />
        <RechartsTooltip
          formatter={(v: number) => [formatarHoras(v), "Horas"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="horas" radius={[3, 3, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.horas > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Gráfico de horas por processo ─────────────────────────────────────────────

interface HorasPorProcessoChartProps {
  registros: RegistroHoras[];
}

function HorasPorProcessoChart({ registros }: HorasPorProcessoChartProps) {
  const map = new Map<string, number>();
  for (const r of registros) {
    const label = r.processos?.numero ?? "Sem processo";
    map.set(label, (map.get(label) ?? 0) + Number(r.horas));
  }

  const data = Array.from(map.entries())
    .map(([processo, horas]) => ({ processo, horas }))
    .sort((a, b) => b.horas - a.horas)
    .slice(0, 8);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum registro no período.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => `${v}h`}
          className="text-muted-foreground"
        />
        <YAxis
          dataKey="processo"
          type="category"
          tick={{ fontSize: 10 }}
          width={100}
          className="text-muted-foreground"
        />
        <RechartsTooltip
          formatter={(v: number) => [formatarHoras(v), "Horas"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="horas" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Timesheet() {
  const { data: registros = [], isLoading } = useRegistrosHoras();
  const deleteMutation = useDeleteRegistroHoras();

  const [formOpen,       setFormOpen]       = useState(false);
  const [editando,       setEditando]       = useState<RegistroHoras | null>(null);
  const [deletando,      setDeletando]      = useState<RegistroHoras | null>(null);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [filtroMes,      setFiltroMes]      = useState<string>("todos");
  const [filtroProcesso, setFiltroProcesso] = useState<string>("todos");
  const [page,           setPage]           = useState(0);
  const [chartMonth,     setChartMonth]     = useState(new Date());

  // ── Opções de filtro ──────────────────────────────────────────────────────

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const r of registros) {
      set.add(r.data.slice(0, 7)); // "yyyy-MM"
    }
    return Array.from(set).sort().reverse();
  }, [registros]);

  const processosDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of registros) {
      if (r.processo_id && r.processos) {
        map.set(r.processo_id, r.processos.numero);
      }
    }
    return Array.from(map.entries());
  }, [registros]);

  // ── Registros filtrados ───────────────────────────────────────────────────

  const filtrados = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return registros.filter((r) => {
      const matchSearch =
        !q ||
        r.descricao.toLowerCase().includes(q) ||
        (r.processos?.numero ?? "").toLowerCase().includes(q) ||
        (r.clientes?.nome ?? "").toLowerCase().includes(q);

      const matchMes = filtroMes === "todos" || r.data.startsWith(filtroMes);

      const matchProcesso =
        filtroProcesso === "todos" ||
        (filtroProcesso === "sem_processo" && !r.processo_id) ||
        r.processo_id === filtroProcesso;

      return matchSearch && matchMes && matchProcesso;
    });
  }, [registros, searchQuery, filtroMes, filtroProcesso]);

  // ── Paginação ─────────────────────────────────────────────────────────────

  const totalPages   = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginados    = filtrados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFilter = (fn: () => void) => { fn(); setPage(0); };

  // ── Estatísticas globais + do mês filtrado ────────────────────────────────

  const statsGlobais = useMemo(() => calcularStats(registros), [registros]);

  const registrosChartMes = useMemo(() => {
    const key = getMonthKey(chartMonth);
    return registros.filter((r) => r.data.startsWith(key));
  }, [registros, chartMonth]);

  const statsChartMes = useMemo(() => calcularStats(registrosChartMes), [registrosChartMes]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openCreate = () => { setEditando(null); setFormOpen(true); };
  const openEdit   = (r: RegistroHoras) => { setEditando(r); setFormOpen(true); };
  const confirmDelete = async () => {
    if (!deletando) return;
    await deleteMutation.mutateAsync(deletando.id);
    setDeletando(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Timer className="h-7 w-7 text-primary" />
              Controle de Horas
            </h1>
            <p className="text-muted-foreground">Timesheet — registre e analise o tempo dedicado a cada processo</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Registro
          </Button>
        </div>

        {/* KPIs */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              icon={Clock}
              label="Total de horas"
              value={formatarHoras(statsGlobais.totalHoras)}
              sub={`${statsGlobais.totalRegistros} registros`}
              colorClass="bg-primary/10 text-primary"
            />
            <KpiCard
              icon={CalendarDays}
              label={`Horas — ${format(new Date(), "MMM/yyyy", { locale: ptBR })}`}
              value={formatarHoras(statsGlobais.horasMes)}
              sub={`${statsGlobais.registrosMes} registros este mês`}
              colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
            />
            <KpiCard
              icon={DollarSign}
              label="Total faturado"
              value={formatCurrency(statsGlobais.totalFaturado)}
              sub="baseado nos registros c/ valor/hora"
              colorClass="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
            />
            <KpiCard
              icon={TrendingUp}
              label="Média diária (mês)"
              value={(() => {
                const diasUteis = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                const media = statsGlobais.horasMes / diasUteis;
                return formatarHoras(Math.max(0, media));
              })()}
              sub="considerando todos os dias do mês"
              colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
            />
          </div>
        )}

        {/* Abas: Lista + Análises */}
        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista" className="gap-2">
              <Clock className="h-4 w-4" /> Lista
            </TabsTrigger>
            <TabsTrigger value="analises" className="gap-2">
              <BarChart2 className="h-4 w-4" /> Análises
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Lista ── */}
          <TabsContent value="lista" className="space-y-4 mt-4">

            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, processo ou cliente…"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => handleFilter(() => setSearchQuery(e.target.value))}
                />
              </div>

              <Select
                value={filtroMes}
                onValueChange={(v) => handleFilter(() => setFiltroMes(v))}
              >
                <SelectTrigger className="w-[160px]">
                  <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  {mesesDisponiveis.map((m) => (
                    <SelectItem key={m} value={m}>
                      {format(new Date(m + "-01T12:00:00"), "MMM yyyy", { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filtroProcesso}
                onValueChange={(v) => handleFilter(() => setFiltroProcesso(v))}
              >
                <SelectTrigger className="w-[200px]">
                  <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Processo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os processos</SelectItem>
                  <SelectItem value="sem_processo">Sem processo</SelectItem>
                  {processosDisponiveis.map(([id, numero]) => (
                    <SelectItem key={id} value={id}>{numero}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Totais dos filtrados */}
            {filtrados.length > 0 && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground px-1">
                <span>
                  <strong className="text-foreground">{filtrados.length}</strong> registro{filtrados.length !== 1 ? "s" : ""}
                </span>
                <span>
                  Total: <strong className="text-primary">
                    {formatarHoras(filtrados.reduce((acc, r) => acc + Number(r.horas), 0))}
                  </strong>
                </span>
                {(() => {
                  const totalFat = filtrados.reduce((acc, r) => {
                    if (r.valor_hora == null) return acc;
                    return acc + Number(r.horas) * Number(r.valor_hora);
                  }, 0);
                  return totalFat > 0 ? (
                    <span>
                      Faturado: <strong className="text-green-600">{formatCurrency(totalFat)}</strong>
                    </span>
                  ) : null;
                })()}
              </div>
            )}

            {/* Lista */}
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[66px] rounded-lg" />)}
              </div>
            ) : filtrados.length === 0 ? (
              <Card className="p-10 text-center shadow-card">
                <Timer className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Nenhum registro encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery || filtroMes !== "todos" || filtroProcesso !== "todos"
                    ? "Tente ajustar os filtros"
                    : 'Clique em "Novo Registro" para começar a controlar seu tempo'}
                </p>
                {!searchQuery && filtroMes === "todos" && filtroProcesso === "todos" && (
                  <Button className="mt-4 gap-2" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Novo Registro
                  </Button>
                )}
              </Card>
            ) : (
              <>
                {/* Cabeçalho da tabela */}
                <div className="hidden md:flex items-center gap-3 px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <div className="w-[88px] shrink-0">Data</div>
                  <div className="flex-1">Descrição / Vínculos</div>
                  <div className="w-[76px] shrink-0 text-right">Horas</div>
                  <div className="w-[100px] shrink-0 text-right">Valor</div>
                  <div className="w-[72px] shrink-0" />
                </div>

                <div className="space-y-2">
                  {paginados.map((r) => (
                    <RegistroRow key={r.id} registro={r} onEdit={openEdit} onDelete={setDeletando} />
                  ))}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-muted-foreground">
                      Página {page + 1} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline" size="sm"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Tab: Análises ── */}
          <TabsContent value="analises" className="space-y-6 mt-4">

            {/* Navegação de mês do gráfico */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline" size="icon"
                onClick={() => setChartMonth((m) => subMonths(m, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-base font-semibold capitalize min-w-[160px] text-center">
                {format(chartMonth, "MMMM yyyy", { locale: ptBR })}
              </span>
              <Button
                variant="outline" size="icon"
                onClick={() => setChartMonth((m) => addMonths(m, 1))}
                disabled={isSameMonth(chartMonth, new Date())}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Badge variant="outline" className="ml-2">
                {formatarHoras(statsChartMes.totalHoras)} · {statsChartMes.totalRegistros} registros
              </Badge>
              {statsChartMes.totalFaturado > 0 && (
                <Badge variant="secondary">
                  {formatCurrency(statsChartMes.totalFaturado)} faturados
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Horas por dia */}
              <Card className="p-4 shadow-card">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Horas por dia — {format(chartMonth, "MMM yyyy", { locale: ptBR })}
                </h3>
                {isLoading ? (
                  <Skeleton className="h-[180px] rounded-lg" />
                ) : (
                  <HorasPorDiaChart registros={registrosChartMes} month={chartMonth} />
                )}
              </Card>

              {/* Horas por processo (período selecionado) */}
              <Card className="p-4 shadow-card">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Horas por processo — {format(chartMonth, "MMM yyyy", { locale: ptBR })}
                </h3>
                {isLoading ? (
                  <Skeleton className="h-[220px] rounded-lg" />
                ) : (
                  <ScrollArea className="h-[220px]">
                    <HorasPorProcessoChart registros={registrosChartMes} />
                  </ScrollArea>
                )}
              </Card>

            </div>

            {/* Resumo mensal — últimos 6 meses */}
            <Card className="p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                Evolução mensal — últimos 6 meses
              </h3>
              {isLoading ? (
                <Skeleton className="h-[180px] rounded-lg" />
              ) : (
                (() => {
                  const months = Array.from({ length: 6 }, (_, i) => {
                    const d = subMonths(new Date(), 5 - i);
                    return { key: getMonthKey(d), label: format(d, "MMM/yy", { locale: ptBR }) };
                  });
                  const chartData = months.map(({ key, label }) => {
                    const horas = registros
                      .filter((r) => r.data.startsWith(key))
                      .reduce((acc, r) => acc + Number(r.horas), 0);
                    const faturado = registros
                      .filter((r) => r.data.startsWith(key) && r.valor_hora != null)
                      .reduce((acc, r) => acc + Number(r.horas) * Number(r.valor_hora!), 0);
                    return { label, horas, faturado };
                  });
                  return (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}h`} className="text-muted-foreground" />
                        <RechartsTooltip
                          formatter={(v: number, name: string) =>
                            name === "horas" ? [formatarHoras(v), "Horas"] : [formatCurrency(v), "Faturado"]
                          }
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Bar dataKey="horas"    name="horas"    fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()
              )}
            </Card>

          </TabsContent>
        </Tabs>

      </div>

      {/* Form dialog */}
      <RegistroHorasForm
        open={formOpen}
        onOpenChange={setFormOpen}
        registro={editando}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletando} onOpenChange={(o) => !o && setDeletando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              O registro "{deletando?.descricao}" ({deletando ? formatarHoras(Number(deletando.horas)) : ""}) será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
