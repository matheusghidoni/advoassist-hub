import { useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Scale,
  FileText,
  PieChart,
  Receipt,
  CheckCircle2,
  Clock,
  Search,
  Filter,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { HonorarioForm } from "@/components/Financeiro/HonorarioForm";
import { DespesaForm } from "@/components/Financeiro/DespesaForm";
import { useHonorarios, useDeleteHonorario, type Honorario } from "@/hooks/queries/useHonorariosQuery";
import { useProcessos } from "@/hooks/queries/useProcessosQuery";
import {
  useDespesas,
  useDeleteDespesa,
  calcularStatsDespesas,
  CATEGORIAS_DESPESA,
  type Despesa,
} from "@/hooks/queries/useDespesasQuery";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─────────────────────────────────────────────────────────────────────────────

export default function Financeiro() {
  const { user } = useAuth();

  // Data
  const { data: honorarios = [], isLoading: loadingHonorarios } = useHonorarios();
  const { data: processos  = [], isLoading: loadingProcessos  } = useProcessos();
  const { data: despesas   = [], isLoading: loadingDespesas   } = useDespesas();

  const deleteHonorario = useDeleteHonorario();
  const deleteDespesa   = useDeleteDespesa();

  const loading = loadingHonorarios || loadingProcessos || loadingDespesas;

  // Honorários UI state
  const [honorarioFormOpen, setHonorarioFormOpen]       = useState(false);
  const [editingHonorario, setEditingHonorario]         = useState<Honorario | null>(null);
  const [deleteHonorarioOpen, setDeleteHonorarioOpen]   = useState(false);
  const [honorarioToDelete, setHonorarioToDelete]       = useState<Honorario | null>(null);

  // Despesas UI state
  const [despesaFormOpen, setDespesaFormOpen]           = useState(false);
  const [editingDespesa, setEditingDespesa]             = useState<Despesa | null>(null);
  const [deleteDespesaOpen, setDeleteDespesaOpen]       = useState(false);
  const [despesaToDelete, setDespesaToDelete]           = useState<Despesa | null>(null);

  // Despesas filters
  const [searchDespesa, setSearchDespesa]               = useState("");
  const [filterCategoria, setFilterCategoria]           = useState("__all__");
  const [filterStatus, setFilterStatus]                 = useState("__all__");

  // ── Honorários stats ────────────────────────────────────────────────────────
  const calcularEstatisticas = () => {
    const totalReceber    = honorarios.reduce((s, h) => s + (h.valor_total - h.valor_pago), 0);
    const totalRecebido   = honorarios.reduce((s, h) => s + h.valor_pago, 0);
    const totalPendente   = honorarios.filter(h => h.status === "pendente").reduce((s, h) => s + h.valor_total, 0);
    const totalGeral      = honorarios.reduce((s, h) => s + h.valor_total, 0);
    const taxaAdimplencia = totalGeral > 0 ? (totalRecebido / totalGeral) * 100 : 0;
    return { totalReceber, totalRecebido, totalPendente, taxaAdimplencia };
  };

  const calcularEstatisticasProcessos = () => {
    const totalValorCausas   = processos.reduce((s, p) => s + (p.valor || 0), 0);
    const processosComValor  = processos.filter(p => p.valor && p.valor > 0);
    const mediaValorCausa    = processosComValor.length > 0 ? totalValorCausas / processosComValor.length : 0;
    const valorPorStatus     = processos.reduce((acc, p) => {
      const st = p.status || "outros";
      acc[st]  = (acc[st] || 0) + (p.valor || 0);
      return acc;
    }, {} as Record<string, number>);
    return { totalValorCausas, mediaValorCausa, processosComValor: processosComValor.length, totalProcessos: processos.length, valorPorStatus };
  };

  const stats         = calcularEstatisticas();
  const statsProc     = calcularEstatisticasProcessos();
  const statsDespesas = calcularStatsDespesas(despesas);

  // ── Despesas filtradas ──────────────────────────────────────────────────────
  const despesasFiltradas = despesas.filter(d => {
    const term = searchDespesa.toLowerCase();
    const matchSearch =
      !term ||
      d.descricao.toLowerCase().includes(term) ||
      (d.processos?.numero ?? "").toLowerCase().includes(term) ||
      (d.clientes?.nome ?? "").toLowerCase().includes(term);
    const matchCategoria = filterCategoria === "__all__" || d.categoria === filterCategoria;
    const matchStatus    = filterStatus    === "__all__" || d.status    === filterStatus;
    return matchSearch && matchCategoria && matchStatus;
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDeleteHonorario = async () => {
    if (!honorarioToDelete) return;
    await deleteHonorario.mutateAsync(honorarioToDelete.id);
    setDeleteHonorarioOpen(false);
    setHonorarioToDelete(null);
  };

  const handleDeleteDespesa = async () => {
    if (!despesaToDelete) return;
    await deleteDespesa.mutateAsync(despesaToDelete.id);
    setDeleteDespesaOpen(false);
    setDespesaToDelete(null);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Controle de honorários, despesas e receitas</p>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Honorários a Receber</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {stats.totalReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Honorários Recebidos</p>
                <p className="text-2xl font-bold text-success">
                  R$ {stats.totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Despesas</p>
                <p className="text-2xl font-bold text-destructive">
                  R$ {statsDespesas.totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pendente: R$ {statsDespesas.totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <Receipt className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resultado Líquido</p>
                <p className={`text-2xl font-bold ${stats.totalRecebido - statsDespesas.totalPago >= 0 ? "text-success" : "text-destructive"}`}>
                  R$ {(stats.totalRecebido - statsDespesas.totalPago).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recebido − Despesas pagas
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <Tabs defaultValue="honorarios" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="honorarios">Honorários</TabsTrigger>
            <TabsTrigger value="despesas">Despesas / Custas</TabsTrigger>
            <TabsTrigger value="causas">Valores das Causas</TabsTrigger>
          </TabsList>

          {/* ════════════════════ TAB: HONORÁRIOS ════════════════════ */}
          <TabsContent value="honorarios" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Honorários Cadastrados</h2>
                <p className="text-sm text-muted-foreground">
                  Taxa de adimplência: <strong>{stats.taxaAdimplencia.toFixed(0)}%</strong>
                </p>
              </div>
              <Button onClick={() => { setEditingHonorario(null); setHonorarioFormOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Honorário
              </Button>
            </div>

            {honorarios.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground shadow-card">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum honorário cadastrado ainda.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {honorarios.map(honorario => {
                  const pct = honorario.valor_total > 0
                    ? (honorario.valor_pago / honorario.valor_total) * 100
                    : 0;
                  return (
                    <Card key={honorario.id} className="p-4 shadow-card">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">
                            {honorario.processos?.clientes?.nome
                              || honorario.clientes?.nome
                              || "Cliente não vinculado"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {honorario.processos?.numero
                              ? `Processo: ${honorario.processos.numero}`
                              : honorario.clientes?.nome
                              ? "Vínculo direto com cliente"
                              : "Sem vínculo"}
                          </p>
                          {honorario.data_vencimento && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Vencimento:{" "}
                              {new Date(honorario.data_vencimento).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              honorario.status === "pago"
                                ? "default"
                                : honorario.status === "parcial"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {honorario.status === "pago"
                              ? "Quitado"
                              : honorario.status === "parcial"
                              ? "Parcial"
                              : "Pendente"}
                          </Badge>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingHonorario(honorario);
                                  setHonorarioFormOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setHonorarioToDelete(honorario);
                                  setDeleteHonorarioOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            R$ {honorario.valor_pago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} /{" "}
                            R$ {honorario.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="font-medium">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full transition-all ${
                              honorario.status === "pago"
                                ? "bg-success"
                                : honorario.status === "parcial"
                                ? "bg-warning"
                                : "bg-destructive"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {honorario.tipo_pagamento === "parcelado" && honorario.numero_parcelas && (
                          <div className="p-2 bg-muted/50 rounded-md">
                            <p className="text-xs text-muted-foreground">
                              <strong className="text-foreground">
                                Parcelado em {honorario.numero_parcelas}x
                              </strong>{" "}
                              — Valor por parcela: R${" "}
                              {(
                                (honorario.valor_total - (honorario.valor_entrada || 0)) /
                                honorario.numero_parcelas
                              ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            {honorario.valor_entrada > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Entrada: R${" "}
                                {honorario.valor_entrada.toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                            )}
                          </div>
                        )}

                        {honorario.observacoes && (
                          <p className="text-sm text-muted-foreground">{honorario.observacoes}</p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ════════════════════ TAB: DESPESAS / CUSTAS ════════════════════ */}
          <TabsContent value="despesas" className="space-y-4">
            {/* Despesas stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Receipt className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Geral</p>
                    <p className="text-lg font-bold">
                      R$ {statsDespesas.totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pagas</p>
                    <p className="text-lg font-bold text-success">
                      R$ {statsDespesas.totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                    <p className="text-lg font-bold text-warning">
                      R$ {statsDespesas.totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Breakdown por categoria */}
            {Object.keys(statsDespesas.porCategoria).length > 0 && (
              <Card className="p-4 shadow-card">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  Por Categoria
                </h3>
                <div className="grid gap-2 md:grid-cols-3">
                  {Object.entries(statsDespesas.porCategoria)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, total]) => {
                      const meta = CATEGORIAS_DESPESA[cat] ?? CATEGORIAS_DESPESA.outros;
                      return (
                        <div key={cat} className={`flex items-center justify-between p-3 rounded-lg border text-sm ${meta.color}`}>
                          <span className="font-medium">{meta.label}</span>
                          <span className="font-bold">
                            R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </Card>
            )}

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar descrição, processo ou cliente..."
                    value={searchDespesa}
                    onChange={e => setSearchDespesa(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger className="w-44">
                    <Filter className="h-3.5 w-3.5 mr-1 opacity-70" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as categorias</SelectItem>
                    {Object.entries(CATEGORIAS_DESPESA).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => { setEditingDespesa(null); setDespesaFormOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Despesa
              </Button>
            </div>

            {/* Lista */}
            {despesasFiltradas.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground shadow-card">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{despesas.length === 0 ? "Nenhuma despesa registrada." : "Nenhuma despesa encontrada."}</p>
                {despesas.length === 0 && (
                  <p className="text-sm mt-1">Clique em "Nova Despesa" para começar.</p>
                )}
              </Card>
            ) : (
              <div className="space-y-2">
                {despesasFiltradas.map(d => {
                  const meta = CATEGORIAS_DESPESA[d.categoria] ?? CATEGORIAS_DESPESA.outros;
                  return (
                    <Card key={d.id} className="p-4 shadow-card hover:bg-accent/30 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`shrink-0 px-2 py-1 rounded-md text-xs font-medium border ${meta.color}`}>
                            {meta.label}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{d.descricao}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(d.data + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                              {d.processos?.numero && (
                                <> · Proc. {d.processos.numero}</>
                              )}
                              {d.clientes?.nome && (
                                <> · {d.clientes.nome}</>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-foreground">
                              R$ {d.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            <Badge
                              variant={d.status === "pago" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {d.status === "pago" ? "Pago" : "Pendente"}
                            </Badge>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingDespesa(d);
                                  setDespesaFormOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setDespesaToDelete(d);
                                  setDeleteDespesaOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {d.observacoes && (
                        <p className="mt-2 text-sm text-muted-foreground pl-0 border-t border-border pt-2">
                          {d.observacoes}
                        </p>
                      )}
                    </Card>
                  );
                })}

                {/* Total filtrado */}
                <div className="flex justify-end pt-2 pr-1">
                  <p className="text-sm text-muted-foreground">
                    Total filtrado:{" "}
                    <strong className="text-foreground">
                      R${" "}
                      {despesasFiltradas
                        .reduce((s, d) => s + d.valor, 0)
                        .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </strong>
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ════════════════════ TAB: VALORES DAS CAUSAS ════════════════════ */}
          <TabsContent value="causas" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-5 shadow-card bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Valor Total das Causas</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  R$ {statsProc.totalValorCausas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {statsProc.processosComValor} de {statsProc.totalProcessos} processos com valor
                </p>
              </Card>

              <Card className="p-5 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Média por Processo</span>
                </div>
                <p className="text-2xl font-bold">
                  R$ {statsProc.mediaValorCausa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </Card>

              <Card className="p-5 shadow-card">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Processos Cadastrados</span>
                </div>
                <p className="text-2xl font-bold">{statsProc.totalProcessos}</p>
              </Card>
            </div>

            <Card className="p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Valores por Status</h3>
              </div>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(statsProc.valorPorStatus).map(([status, valor]) => {
                  const statusLabels: Record<string, string> = {
                    em_andamento: "Em Andamento",
                    suspenso:     "Suspenso",
                    concluido:    "Concluído",
                    arquivado:    "Arquivado",
                  };
                  const statusColors: Record<string, string> = {
                    em_andamento: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                    suspenso:     "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
                    concluido:    "bg-green-500/10 text-green-600 border-green-500/20",
                    arquivado:    "bg-gray-500/10 text-gray-600 border-gray-500/20",
                  };
                  return (
                    <div
                      key={status}
                      className={`p-3 rounded-lg border ${statusColors[status] ?? "bg-muted border-border"}`}
                    >
                      <p className="text-xs font-medium mb-1">{statusLabels[status] ?? status}</p>
                      <p className="text-lg font-bold">
                        R$ {valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      <HonorarioForm
        open={honorarioFormOpen}
        onOpenChange={setHonorarioFormOpen}
        onSuccess={() => {}}
        editingHonorario={editingHonorario}
      />

      <DespesaForm
        open={despesaFormOpen}
        onOpenChange={setDespesaFormOpen}
        editingDespesa={editingDespesa}
      />

      {/* Delete honorário */}
      <AlertDialog open={deleteHonorarioOpen} onOpenChange={setDeleteHonorarioOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este honorário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHonorario}
              disabled={deleteHonorario.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteHonorario.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete despesa */}
      <AlertDialog open={deleteDespesaOpen} onOpenChange={setDeleteDespesaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a despesa{" "}
              <strong>"{despesaToDelete?.descricao}"</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDespesa}
              disabled={deleteDespesa.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDespesa.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
