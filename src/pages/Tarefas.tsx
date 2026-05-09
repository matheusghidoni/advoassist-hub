import { useMemo, useRef, useState } from "react";
import { isPast, isToday, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, Search, Pencil, Trash2, MoreVertical,
  AlertCircle, Clock, CheckCircle2, XCircle,
  ArrowRight, ChevronLeft, ChevronRight,
  UserCheck, UserX, Users,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TarefaForm } from "@/components/Tarefas/TarefaForm";
import {
  useTarefas,
  useMoverTarefa,
  useDeleteTarefa,
  useDelegarTarefa,
  type Tarefa,
  type TarefaStatus,
} from "@/hooks/queries/useTarefasQuery";
import { useEquipe } from "@/hooks/queries/useEquipeQuery";
import { useAuth } from "@/hooks/useAuth";

// ── Metadados visuais por status e prioridade ────────────────────────────────

const STATUS_META: Record<TarefaStatus, {
  label: string;
  icon:  React.ElementType;
  header: string;
  badge:  string;
  nextStatus: TarefaStatus | null;
  nextLabel:  string | null;
}> = {
  pendente: {
    label:  "Pendente",
    icon:   Clock,
    header: "bg-muted/60 border-border",
    badge:  "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    nextStatus: "em_andamento",
    nextLabel:  "Iniciar",
  },
  em_andamento: {
    label:  "Em andamento",
    icon:   ArrowRight,
    header: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
    badge:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    nextStatus: "concluida",
    nextLabel:  "Concluir",
  },
  concluida: {
    label:  "Concluída",
    icon:   CheckCircle2,
    header: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
    badge:  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    nextStatus: null,
    nextLabel:  null,
  },
  cancelada: {
    label:  "Cancelada",
    icon:   XCircle,
    header: "bg-muted/40 border-border",
    badge:  "bg-muted text-muted-foreground",
    nextStatus: null,
    nextLabel:  null,
  },
};

const PRIORIDADE_META: Record<string, { label: string; cls: string }> = {
  baixa:   { label: "Baixa",   cls: "bg-muted text-muted-foreground" },
  media:   { label: "Média",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  alta:    { label: "Alta",    cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  urgente: { label: "Urgente", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

const KANBAN_COLS: TarefaStatus[] = ["pendente", "em_andamento", "concluida", "cancelada"];
const PAGE_SIZE = 5;

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function Tarefas() {
  const { user } = useAuth();
  const { data: tarefas = [], isLoading } = useTarefas();
  const { data: membros = [] } = useEquipe();
  const moverTarefa  = useMoverTarefa();
  const deleteTarefa = useDeleteTarefa();
  const delegarTarefa = useDelegarTarefa();

  const isMobile = useIsMobile();
  const [activeCol, setActiveCol]         = useState<TarefaStatus>("pendente");
  const [search, setSearch]               = useState("");
  const [formOpen, setFormOpen]           = useState(false);
  const [editing, setEditing]             = useState<Tarefa | null>(null);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [delegandoTarefa, setDelegandoTarefa] = useState<Tarefa | null>(null);
  const [pages, setPages]                 = useState<Record<TarefaStatus, number>>({
    pendente: 0, em_andamento: 0, concluida: 0, cancelada: 0,
  });

  // ── Drag and drop ─────────────────────────────────────────────────────────
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TarefaStatus | null>(null);
  const dragCounter                   = useRef<Record<string, number>>({});

  const handleDragStart = (e: React.DragEvent, tarefaId: string) => {
    e.dataTransfer.setData("tarefaId", tarefaId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(tarefaId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
    dragCounter.current = {};
  };

  const handleDragEnter = (e: React.DragEvent, status: TarefaStatus) => {
    e.preventDefault();
    dragCounter.current[status] = (dragCounter.current[status] ?? 0) + 1;
    setDragOverCol(status);
  };

  const handleDragLeave = (e: React.DragEvent, status: TarefaStatus) => {
    dragCounter.current[status] = (dragCounter.current[status] ?? 1) - 1;
    if (dragCounter.current[status] <= 0) {
      dragCounter.current[status] = 0;
      setDragOverCol((prev) => (prev === status ? null : prev));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: TarefaStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("tarefaId");
    if (!id) return;
    const tarefa = tarefas.find((t) => t.id === id);
    if (tarefa && tarefa.status !== status) {
      moverTarefa.mutate({ id, status });
    }
    setDraggingId(null);
    setDragOverCol(null);
    dragCounter.current = {};
  };

  const q = search.trim().toLowerCase();

  const filtered = useMemo(() =>
    tarefas.filter((t) =>
      !q ||
      t.titulo.toLowerCase().includes(q) ||
      (t.descricao ?? "").toLowerCase().includes(q) ||
      (t.processos?.numero ?? "").toLowerCase().includes(q) ||
      (t.clientes?.nome ?? "").toLowerCase().includes(q),
    ),
  [tarefas, q]);

  const byStatus = (status: TarefaStatus) =>
    filtered.filter((t) => t.status === status);

  const paginated = (status: TarefaStatus) => {
    const items = byStatus(status);
    const p = pages[status];
    return {
      items:      items.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE),
      total:      items.length,
      totalPages: Math.ceil(items.length / PAGE_SIZE),
      page:       p,
    };
  };

  const setPage = (status: TarefaStatus, p: number) =>
    setPages((prev) => ({ ...prev, [status]: p }));

  const totalPendentes    = useMemo(() => tarefas.filter((t) => t.status === "pendente").length, [tarefas]);
  const totalEmAndamento  = useMemo(() => tarefas.filter((t) => t.status === "em_andamento").length, [tarefas]);
  const totalConcluidas   = useMemo(() => tarefas.filter((t) => t.status === "concluida").length, [tarefas]);
  const urgentes          = useMemo(() => tarefas.filter((t) => t.prioridade === "urgente" && t.status !== "concluida" && t.status !== "cancelada").length, [tarefas]);

  const getVencimentoCls = (data: string | null, status: TarefaStatus) => {
    if (!data || status === "concluida" || status === "cancelada") return "text-muted-foreground";
    const d = new Date(data + "T12:00:00");
    if (isPast(d) && !isToday(d)) return "text-destructive font-semibold";
    if (isToday(d)) return "text-warning font-semibold";
    return "text-muted-foreground";
  };

  // Membros disponíveis para delegação (excluindo o usuário atual)
  const membrosParaDelegar = membros.filter(
    (m) => m.status === "ativo" && m.user_id !== user?.id
  );

  const handleDelegar = (userId: string) => {
    if (!delegandoTarefa) return;
    delegarTarefa.mutate(
      { id: delegandoTarefa.id, delegado_a: userId },
      { onSuccess: () => setDelegandoTarefa(null) }
    );
  };

  const handleRemoverDelegacao = (tarefaId: string) => {
    delegarTarefa.mutate({ id: tarefaId, delegado_a: null });
  };

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tarefas</h1>
            <p className="text-muted-foreground">Controle interno de trabalho do escritório</p>
          </div>
          <Button className="gap-2" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Pendentes",    value: totalPendentes,   color: "text-slate-600" },
            { label: "Em andamento", value: totalEmAndamento, color: "text-blue-600" },
            { label: "Concluídas",   value: totalConcluidas,  color: "text-green-600" },
            { label: "Urgentes",     value: urgentes,         color: urgentes > 0 ? "text-destructive" : "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-4 shadow-card text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </Card>
          ))}
        </div>

        {/* Busca */}
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            className="pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPages({ pendente: 0, em_andamento: 0, concluida: 0, cancelada: 0 }); }}
          />
        </div>

        {/* ── Mobile: abas de coluna ── */}
        {isMobile && (
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {KANBAN_COLS.map((status) => {
              const meta = STATUS_META[status];
              const Icon = meta.icon;
              const count = byStatus(status).length;
              const isActive = activeCol === status;
              return (
                <button
                  key={status}
                  onClick={() => setActiveCol(status)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors border shrink-0
                    ${isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/60 text-muted-foreground border-transparent hover:bg-muted"
                    }`}
                >
                  <Icon className="h-3 w-3" />
                  {meta.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold
                    ${isActive ? "bg-white/20 text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Board Kanban */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {(isMobile ? [activeCol] : KANBAN_COLS).map((col) => (
              <Skeleton key={col} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className={isMobile ? "flex flex-col gap-2" : "grid grid-cols-4 gap-4 items-start"}>
            {(isMobile ? [activeCol] : KANBAN_COLS).map((status) => {
              const meta  = STATUS_META[status];
              const Icon  = meta.icon;
              const { items, total, totalPages, page } = paginated(status);
              const isOver = dragOverCol === status;

              return (
                <div
                  key={status}
                  className="flex flex-col gap-2"
                  onDragEnter={(e) => handleDragEnter(e, status)}
                  onDragLeave={(e) => handleDragLeave(e, status)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  {/* Cabeçalho da coluna — visível só no desktop */}
                  {!isMobile && (
                    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${meta.header}`}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">{meta.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground bg-background/60 rounded-full px-2 py-0.5">
                        {total}
                      </span>
                    </div>
                  )}

                  {/* Cards */}
                  <div className={`space-y-2 min-h-[80px] rounded-lg transition-colors duration-150 p-1 -m-1 ${
                    isOver && draggingId ? "bg-primary/5 ring-2 ring-primary/20 ring-dashed" : ""
                  }`}>
                    {items.length === 0 ? (
                      <div className={`rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors ${
                        isOver && draggingId ? "border-primary/40 text-primary/60" : ""
                      }`}>
                        {q ? "Nenhuma tarefa encontrada" : isOver && draggingId ? "Soltar aqui" : "Nenhuma tarefa"}
                      </div>
                    ) : (
                      items.map((tarefa) => (
                        <TarefaCard
                          key={tarefa.id}
                          tarefa={tarefa}
                          isDragging={draggingId === tarefa.id}
                          vencimentoCls={getVencimentoCls(tarefa.data_vencimento, tarefa.status as TarefaStatus)}
                          onEdit={() => { setEditing(tarefa); setFormOpen(true); }}
                          onDelete={() => setDeleteId(tarefa.id)}
                          onMover={(s) => moverTarefa.mutate({ id: tarefa.id, status: s })}
                          onDelegar={() => setDelegandoTarefa(tarefa)}
                          onRemoverDelegacao={() => handleRemoverDelegacao(tarefa.id)}
                          onDragStart={(e) => handleDragStart(e, tarefa.id)}
                          onDragEnd={handleDragEnd}
                          nextStatus={meta.nextStatus}
                          nextLabel={meta.nextLabel}
                          temEquipe={membrosParaDelegar.length > 0}
                          isMobile={isMobile}
                          allStatuses={KANBAN_COLS}
                        />
                      ))
                    )}
                  </div>

                  {/* Paginação da coluna */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-1">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        disabled={page === 0}
                        onClick={() => setPage(status, page - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {page + 1} / {totalPages}
                      </span>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(status, page + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form de criação/edição */}
      <TarefaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => {}}
        tarefa={editing}
      />

      {/* Dialog de delegação */}
      <Dialog open={!!delegandoTarefa} onOpenChange={(o) => { if (!o) setDelegandoTarefa(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Delegar Tarefa
            </DialogTitle>
            <DialogDescription>
              Selecione um membro da equipe para receber <strong>{delegandoTarefa?.titulo}</strong>.
              Ele será notificado automaticamente.
            </DialogDescription>
          </DialogHeader>

          {membrosParaDelegar.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
              <Users className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhum outro membro na equipe.</p>
              <p className="text-xs">Convide colegas na página Equipe.</p>
            </div>
          ) : (
            <ul className="divide-y max-h-72 overflow-y-auto">
              {membrosParaDelegar.map((membro) => {
                const nome = membro.profiles?.full_name ?? "Membro";
                const isDelegadoAtual = delegandoTarefa?.delegado_a === membro.user_id;
                return (
                  <li key={membro.id}>
                    <button
                      className={`w-full flex items-center gap-3 px-2 py-3 rounded-lg text-left transition-colors hover:bg-muted/60 ${
                        isDelegadoAtual ? "bg-primary/5 ring-1 ring-primary/20" : ""
                      }`}
                      onClick={() => handleDelegar(membro.user_id)}
                      disabled={delegarTarefa.isPending}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {getInitials(nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{nome}</p>
                        {membro.profiles?.oab && (
                          <p className="text-xs text-muted-foreground">OAB {membro.profiles.oab}</p>
                        )}
                      </div>
                      {isDelegadoAtual && (
                        <Badge variant="outline" className="text-[10px] text-primary border-primary/30 shrink-0">
                          Atual
                        </Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Remover delegação se já estiver delegada */}
          {delegandoTarefa?.delegado_a && (
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground gap-2"
                onClick={() => {
                  handleRemoverDelegacao(delegandoTarefa.id);
                  setDelegandoTarefa(null);
                }}
                disabled={delegarTarefa.isPending}
              >
                <UserX className="h-4 w-4" />
                Remover delegação
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) deleteTarefa.mutate(deleteId); setDeleteId(null); }}
              disabled={deleteTarefa.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

// ── Card individual ───────────────────────────────────────────────────────────

interface TarefaCardProps {
  tarefa:              Tarefa;
  isDragging:          boolean;
  vencimentoCls:       string;
  onEdit:              () => void;
  onDelete:            () => void;
  onMover:             (status: TarefaStatus) => void;
  onDelegar:           () => void;
  onRemoverDelegacao:  () => void;
  onDragStart:         (e: React.DragEvent) => void;
  onDragEnd:           () => void;
  nextStatus:          TarefaStatus | null;
  nextLabel:           string | null;
  temEquipe:           boolean;
  isMobile:            boolean;
  allStatuses:         TarefaStatus[];
}

function TarefaCard({
  tarefa, isDragging, vencimentoCls, onEdit, onDelete, onMover,
  onDelegar, onRemoverDelegacao, onDragStart, onDragEnd,
  nextStatus, nextLabel, temEquipe, isMobile, allStatuses,
}: TarefaCardProps) {
  const prioMeta = PRIORIDADE_META[tarefa.prioridade] ?? PRIORIDADE_META.media;
  const isClosed = tarefa.status === "concluida" || tarefa.status === "cancelada";
  const delegadoNome = (tarefa as any).delegado_perfil?.full_name ?? null;

  return (
    <Card
      draggable={!isMobile}
      onDragStart={isMobile ? undefined : onDragStart}
      onDragEnd={isMobile ? undefined : onDragEnd}
      className={`p-3 shadow-sm transition-all space-y-2
        ${isMobile ? "" : "cursor-grab active:cursor-grabbing select-none"}
        ${isClosed ? "opacity-70" : ""}
        ${isDragging ? "opacity-40 scale-95 shadow-none" : "hover:shadow-md hover:-translate-y-0.5"}
      `}
    >
      {/* Linha superior: prioridade + menu */}
      <div className="flex items-start justify-between gap-2">
        <Badge className={`text-[10px] h-5 px-1.5 shrink-0 ${prioMeta.cls}`}>
          {tarefa.prioridade === "urgente" && <AlertCircle className="h-2.5 w-2.5 mr-0.5" />}
          {prioMeta.label}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 -mt-0.5 -mr-1">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {/* No mobile: mostrar todas as colunas para mover */}
            {isMobile ? (
              <>
                {allStatuses
                  .filter((s) => s !== tarefa.status)
                  .map((s) => {
                    const m = STATUS_META[s];
                    const MIcon = m.icon;
                    return (
                      <DropdownMenuItem key={s} onClick={() => onMover(s)}>
                        <MIcon className="h-4 w-4 mr-2" />
                        Mover para {m.label}
                      </DropdownMenuItem>
                    );
                  })}
                <DropdownMenuSeparator />
              </>
            ) : nextStatus && (
              <>
                <DropdownMenuItem onClick={() => onMover(nextStatus)}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {nextLabel}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>

            {/* Delegar / Redelegar */}
            {temEquipe && (
              <DropdownMenuItem onClick={onDelegar}>
                <UserCheck className="h-4 w-4 mr-2" />
                {tarefa.delegado_a ? "Redelegar" : "Delegar"}
              </DropdownMenuItem>
            )}

            {/* Remover delegação */}
            {tarefa.delegado_a && (
              <DropdownMenuItem onClick={onRemoverDelegacao} className="text-muted-foreground">
                <UserX className="h-4 w-4 mr-2" />
                Remover delegação
              </DropdownMenuItem>
            )}

            {tarefa.status !== "cancelada" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onMover("cancelada")}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Título */}
      <p className={`text-sm font-medium leading-snug ${isClosed ? "line-through text-muted-foreground" : "text-foreground"}`}>
        {tarefa.titulo}
      </p>

      {/* Descrição */}
      {tarefa.descricao && (
        <p className="text-xs text-muted-foreground line-clamp-2">{tarefa.descricao}</p>
      )}

      {/* Badge de delegação */}
      {delegadoNome && (
        <div className="flex items-center gap-1.5 rounded-md bg-primary/5 border border-primary/15 px-2 py-1">
          <UserCheck className="h-3 w-3 text-primary shrink-0" />
          <span className="text-[11px] text-primary font-medium truncate">{delegadoNome}</span>
        </div>
      )}

      {/* Rodapé: vínculos + vencimento */}
      <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-border">
        {tarefa.processos?.numero && (
          <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground truncate max-w-[100px]">
            {tarefa.processos.numero}
          </span>
        )}
        {tarefa.clientes?.nome && (
          <span className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground truncate max-w-[100px]">
            {tarefa.clientes.nome}
          </span>
        )}
        {tarefa.data_vencimento && (
          <span className={`text-[10px] ml-auto flex items-center gap-0.5 ${vencimentoCls}`}>
            <Clock className="h-2.5 w-2.5" />
            {format(new Date(tarefa.data_vencimento + "T12:00:00"), "dd/MM/yy", { locale: ptBR })}
          </span>
        )}
      </div>

      {/* Botão rápido de avanço — apenas desktop */}
      {!isMobile && nextStatus && !isClosed && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs gap-1"
          onClick={() => onMover(nextStatus)}
        >
          <ArrowRight className="h-3 w-3" />
          {nextLabel}
        </Button>
      )}
    </Card>
  );
}
