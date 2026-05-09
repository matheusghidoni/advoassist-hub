import { useMemo, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Search, MoreVertical, Calendar, User, Pencil, Trash2,
  Clock, AlertCircle, CheckCircle2, Circle, ArrowUpDown,
  ChevronLeft, ChevronRight, FolderOpen, MessageSquare,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProcessoForm } from "@/components/Processos/ProcessoForm";
import { AndamentosProcessuais } from "@/components/Processos/AndamentosProcessuais";
import { ProcessoDocumentos } from "@/components/Processos/ProcessoDocumentos";
import { ComunicacaoLog } from "@/components/Comunicacoes/ComunicacaoLog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  useProcessos,
  useDeleteProcesso,
  useTogglePrazoConcluido,
  type Processo,
} from "@/hooks/queries/useProcessosQuery";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { queryKeys } from "@/hooks/queries/queryKeys";

type PrazoFilter = "todos" | "vencidos" | "proximos" | "em_dia";
type SortOrder   = "recente" | "proximo_prazo";

const PAGE_SIZE = 15;

export default function Processos() {
  const { user }       = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient    = useQueryClient();
  const { data: processos = [], isLoading } = useProcessos();
  const deleteProcesso = useDeleteProcesso();
  const togglePrazo    = useTogglePrazoConcluido();

  const [page, setPage]               = useState(0);
  const [formOpen, setFormOpen]       = useState(false);
  const [editingProcesso, setEditingProcesso] = useState<Processo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [processoToDelete, setProcessoToDelete] = useState<Processo | null>(null);
  const [docProcesso, setDocProcesso] = useState<{ id: string; numero: string } | null>(null);
  const [comProcesso, setComProcesso] = useState<{ id: string; numero: string } | null>(null);
  const [searchTerm, setSearchTerm]   = useState("");
  const [prazoFilter, setPrazoFilter] = useState<PrazoFilter>("todos");
  const [sortOrder, setSortOrder]     = useState<SortOrder>("recente");

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const getPrazoStatusColor = (data: string, concluido: boolean) => {
    if (concluido) return "text-muted-foreground line-through";
    const prazoDate = new Date(data);
    if (isPast(prazoDate) && !isToday(prazoDate)) return "text-destructive";
    if (isToday(prazoDate) || isTomorrow(prazoDate)) return "text-warning";
    return "text-foreground";
  };

  const getPrazoPrioridadeColor = (prioridade: string) => {
    const colors: Record<string, string> = {
      alta:  "bg-destructive/10 text-destructive border-destructive/30",
      media: "bg-warning/10 text-warning border-warning/30",
      baixa: "bg-muted text-muted-foreground border-muted-foreground/30",
    };
    return colors[prioridade] ?? colors.media;
  };

  const hasVencidos = (prazos: Processo["prazos"]) =>
    prazos?.some((p) => !p.concluido && isPast(new Date(p.data)) && !isToday(new Date(p.data))) ?? false;

  const hasProximos = (prazos: Processo["prazos"]) => {
    const hoje    = new Date();
    const seteDias = new Date();
    seteDias.setDate(hoje.getDate() + 7);
    return (
      prazos?.some((p) => {
        if (p.concluido) return false;
        const d = new Date(p.data);
        return isToday(d) || isTomorrow(d) || (d > hoje && d <= seteDias);
      }) ?? false
    );
  };

  const getProximoPrazo = (prazos: Processo["prazos"]): Date | null => {
    const pendentes = prazos?.filter((p) => !p.concluido) ?? [];
    if (pendentes.length === 0) return null;
    return new Date(
      [...pendentes].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())[0].data,
    );
  };

  const filtered = useMemo(() => {
    return processos.filter((processo) => {
      const matchesSearch =
        processo.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        processo.tipo.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (prazoFilter === "vencidos") return hasVencidos(processo.prazos);
      if (prazoFilter === "proximos") return hasProximos(processo.prazos);
      if (prazoFilter === "em_dia")   return !hasVencidos(processo.prazos) && !hasProximos(processo.prazos);
      return true;
    });
  }, [processos, searchTerm, prazoFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortOrder === "proximo_prazo") {
        const prazoA = getProximoPrazo(a.prazos);
        const prazoB = getProximoPrazo(b.prazos);
        if (!prazoA && !prazoB) return 0;
        if (!prazoA) return 1;
        if (!prazoB) return -1;
        return prazoA.getTime() - prazoB.getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filtered, sortOrder]);

  const paginated  = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const vencidosCount = useMemo(() => processos.filter((p) => hasVencidos(p.prazos)).length, [processos]);
  const proximosCount = useMemo(() => processos.filter((p) => hasProximos(p.prazos)).length, [processos]);
  const emAndamento   = useMemo(() => processos.filter((p) => p.status === "em_andamento").length, [processos]);
  const suspensos     = useMemo(() => processos.filter((p) => p.status === "suspenso").length, [processos]);
  const concluidos    = useMemo(() => processos.filter((p) => p.status === "concluido").length, [processos]);
  const arquivados    = useMemo(() => processos.filter((p) => p.status === "arquivado").length, [processos]);

  const getStatusVariant = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      em_andamento: { label: "Em andamento", className: "bg-status-active text-success-foreground" },
      suspenso:     { label: "Suspenso",     className: "bg-status-pending text-warning-foreground" },
      concluido:    { label: "Concluído",    className: "bg-status-completed text-primary-foreground" },
      arquivado:    { label: "Arquivado",    className: "bg-status-archived text-muted-foreground" },
    };
    return variants[status] ?? variants.em_andamento;
  };

  const handleDelete = async () => {
    if (!processoToDelete) return;
    await deleteProcesso.mutateAsync(processoToDelete.id);
    setDeleteDialogOpen(false);
    setProcessoToDelete(null);
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.processos(escritorioId ?? '') });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Processos</h1>
            <p className="text-muted-foreground">Acompanhe todos os seus processos</p>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              setEditingProcesso(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Processo
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="p-4 shadow-card">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, cliente, tipo..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground mr-2">Filtrar por prazos:</span>
                {(
                  [
                    { key: "todos",    label: "Todos" },
                    { key: "vencidos", label: `Vencidos (${vencidosCount})`, icon: AlertCircle, className: "border-destructive/50 text-destructive hover:bg-destructive/10" },
                    { key: "proximos", label: `Próximos 7 dias (${proximosCount})`, icon: Clock, className: "border-warning/50 text-warning hover:bg-warning/10" },
                    { key: "em_dia",   label: "Em dia" },
                  ] as const
                ).map(({ key, label, icon: Icon, className }) => (
                  <Button
                    key={key}
                    variant={prazoFilter === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setPrazoFilter(key); setPage(0); }}
                    className={prazoFilter !== key ? className : ""}
                  >
                    {Icon && <Icon className="mr-1 h-4 w-4" />}
                    {label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ordenar:</span>
                <Button
                  variant={sortOrder === "recente" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortOrder("recente")}
                >
                  Mais recente
                </Button>
                <Button
                  variant={sortOrder === "proximo_prazo" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortOrder("proximo_prazo")}
                >
                  <ArrowUpDown className="mr-1 h-4 w-4" />
                  Próximo prazo
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Process Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { value: emAndamento, label: "Em andamento", color: "text-status-active" },
            { value: suspensos,   label: "Suspensos",    color: "text-status-pending" },
            { value: concluidos,  label: "Concluídos",   color: "text-status-completed" },
            { value: arquivados,  label: "Arquivados",   color: "text-status-archived" },
          ].map(({ value, label, color }) => (
            <Card key={label} className="p-4 shadow-card">
              <div className="text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Process List */}
        <div className="grid gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))
          ) : paginated.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">
                {searchTerm ? "Nenhum processo encontrado" : "Nenhum processo cadastrado"}
              </p>
            </Card>
          ) : (
            paginated.map((processo) => {
              const statusInfo        = getStatusVariant(processo.status);
              const temPrazosVencidos = hasVencidos(processo.prazos);
              const quantidadeVencidos = processo.prazos?.filter(
                (p) => !p.concluido && isPast(new Date(p.data)) && !isToday(new Date(p.data)),
              ).length ?? 0;

              return (
                <Card
                  key={processo.id}
                  className={`p-6 shadow-card hover:shadow-md transition-shadow relative ${
                    temPrazosVencidos ? "border-destructive border-2 bg-destructive/5" : ""
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-foreground">{processo.numero}</h3>
                          <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                          <Badge variant="outline">{processo.tipo}</Badge>
                          {temPrazosVencidos && (
                            <Badge className="bg-destructive text-destructive-foreground gap-1 animate-pulse">
                              <AlertCircle className="h-3 w-3" />
                              {quantidadeVencidos} prazo{quantidadeVencidos > 1 ? "s" : ""} vencido
                              {quantidadeVencidos > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        {processo.comarca && (
                          <p className="text-sm text-muted-foreground">Comarca: {processo.comarca}</p>
                        )}
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
                              setEditingProcesso(processo);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setComProcesso({ id: processo.id, numero: processo.numero })}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Comunicações
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDocProcesso({ id: processo.id, numero: processo.numero })}
                          >
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Documentos
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setProcessoToDelete(processo);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>
                          Cliente:{" "}
                          <span className="font-medium text-foreground">
                            {processo.clientes?.nome ?? "Não vinculado"}
                          </span>
                        </span>
                      </div>
                      {processo.vara && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>
                            Vara:{" "}
                            <span className="font-medium text-foreground">{processo.vara}</span>
                          </span>
                        </div>
                      )}
                      {processo.valor && (
                        <div className="flex items-center gap-4 text-muted-foreground col-span-2 md:col-span-1">
                          <span>
                            Valor:{" "}
                            <span className="font-medium text-foreground">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(processo.valor)}
                            </span>
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            Hon. Est. (20%):{" "}
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(processo.valor * 0.2)}
                          </span>
                        </div>
                      )}
                    </div>

                    <AndamentosProcessuais
                      processoId={processo.id}
                      processoNumero={processo.numero}
                    />

                    {processo.prazos && processo.prazos.length > 0 && (
                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">
                            Prazos ({processo.prazos.length})
                          </span>
                        </div>
                        <div className="grid gap-2">
                          {[...processo.prazos]
                            .sort(
                              (a, b) =>
                                new Date(a.data).getTime() - new Date(b.data).getTime(),
                            )
                            .slice(0, 3)
                            .map((prazo) => (
                              <div
                                key={prazo.id}
                                className="flex items-center justify-between p-2 rounded-md bg-muted/50 group"
                              >
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() =>
                                      togglePrazo.mutate({
                                        prazoId: prazo.id,
                                        concluido: prazo.concluido,
                                      })
                                    }
                                    className="flex-shrink-0 hover:scale-110 transition-transform"
                                    title={
                                      prazo.concluido
                                        ? "Marcar como pendente"
                                        : "Marcar como concluído"
                                    }
                                  >
                                    {prazo.concluido ? (
                                      <CheckCircle2 className="h-5 w-5 text-primary" />
                                    ) : (
                                      <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                                    )}
                                  </button>
                                  {isPast(new Date(prazo.data)) &&
                                    !prazo.concluido &&
                                    !isToday(new Date(prazo.data)) && (
                                      <AlertCircle className="h-4 w-4 text-destructive" />
                                    )}
                                  <div>
                                    <p
                                      className={`text-sm font-medium ${getPrazoStatusColor(prazo.data, prazo.concluido)}`}
                                    >
                                      {prazo.titulo}
                                    </p>
                                    <p
                                      className={`text-xs ${getPrazoStatusColor(prazo.data, prazo.concluido)}`}
                                    >
                                      {format(new Date(prazo.data), "dd 'de' MMMM 'de' yyyy", {
                                        locale: ptBR,
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${getPrazoPrioridadeColor(prazo.prioridade)}`}
                                  >
                                    {prazo.prioridade === "alta"
                                      ? "Alta"
                                      : prazo.prioridade === "media"
                                      ? "Média"
                                      : "Baixa"}
                                  </Badge>
                                  {prazo.concluido && (
                                    <Badge variant="secondary" className="text-xs">
                                      Concluído
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          {processo.prazos.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center pt-1">
                              + {processo.prazos.length - 3} prazo(s) adicional(is)
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {sorted.length} processo{sorted.length !== 1 ? "s" : ""} — página {page + 1} de{" "}
              {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ProcessoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={invalidate}
        processo={editingProcesso}
      />

      <ProcessoDocumentos
        open={!!docProcesso}
        onOpenChange={(o) => !o && setDocProcesso(null)}
        processo={docProcesso}
      />

      <ComunicacaoLog
        open={!!comProcesso}
        onOpenChange={(o) => !o && setComProcesso(null)}
        processo={comProcesso}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o processo {processoToDelete?.numero}? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteProcesso.isPending}
            >
              {deleteProcesso.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
