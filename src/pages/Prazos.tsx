import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { usePrazos, useDeletePrazo, useMovePrazo, useTogglePrazo } from "@/hooks/queries/usePrazosQuery";
import { queryKeys } from "@/hooks/queries/queryKeys";
import { useAgenda, type AgendaEvent } from "@/hooks/queries/useAgendaQuery";
import { ANDAMENTO_TIPO_OPTIONS } from "@/hooks/queries/useAndamentosQuery";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Pencil, Trash2,
  MoreVertical, FileText, AlertCircle, Filter, LayoutGrid, List,
  Gavel, Scale, BookOpen, CornerUpRight, Bell, Handshake, Send, HelpCircle,
  MessageSquare, CheckCircle2,
} from "lucide-react";
import { CalendarioPrazos } from "@/components/Prazos/CalendarioPrazos";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useMemo, useState, useEffect, DragEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PrazoForm } from "@/components/Prazos/PrazoForm";
import {
  format, parseISO, isPast, isToday, isSameDay,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isWithinInterval, addDays, addWeeks,
  addMonths, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { normalizePrazoTipo } from "@/lib/prazoOptions";

// ── Helpers da vista Calendário (ex-Agenda) ───────────────────────────────────

const ANDAMENTO_META: Record<string, { icon: React.ElementType; chip: string }> = {
  audiencia:  { icon: Gavel,         chip: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  decisao:    { icon: Scale,         chip: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  despacho:   { icon: MessageSquare, chip: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  sentenca:   { icon: BookOpen,      chip: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  recurso:    { icon: CornerUpRight,  chip: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  citacao:    { icon: Bell,          chip: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  intimacao:  { icon: Bell,          chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  acordo:     { icon: Handshake,     chip: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  peticao:    { icon: Send,          chip: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
  outros:     { icon: HelpCircle,    chip: "bg-muted text-muted-foreground" },
};
const fallbackMeta = { icon: FileText, chip: "bg-muted text-muted-foreground" };

function eventChipClass(event: AgendaEvent): string {
  if (event.kind === "prazo") {
    if (event.concluido) return "bg-muted text-muted-foreground line-through";
    if (event.prioridade === "alta")  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    if (event.prioridade === "media") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  }
  return (ANDAMENTO_META[event.andamentoTipo ?? ""] ?? fallbackMeta).chip;
}

function AgendaEventIcon({ event, className }: { event: AgendaEvent; className?: string }) {
  if (event.kind === "prazo") {
    if (event.concluido) return <CheckCircle2 className={className} />;
    if (event.prioridade === "alta") return <AlertCircle className={className} />;
    return <Clock className={className} />;
  }
  const Meta = ANDAMENTO_META[event.andamentoTipo ?? ""] ?? fallbackMeta;
  const Icon = Meta.icon;
  return <Icon className={className} />;
}

const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function AgendaDayCell({ day, events, isSelected, onClick }: {
  day: Date; events: AgendaEvent[]; isSelected: boolean; onClick: () => void;
}) {
  const hasOverdue = events.some(
    (e) => e.kind === "prazo" && !e.concluido && isPast(new Date(e.date)) && !isToday(new Date(e.date)),
  );
  return (
    <div
      onClick={onClick}
      className={`min-h-[90px] p-1.5 cursor-pointer rounded-lg border border-border transition-colors
        ${isSelected ? "bg-primary/10" : "hover:bg-muted/60"}
        ${hasOverdue ? "border-destructive/40" : ""}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-semibold h-6 w-6 flex items-center justify-center rounded-full
          ${isToday(day) ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
            : isSelected ? "text-primary" : "text-foreground"}`}>
          {format(day, "d")}
        </span>
        {events.length > 3 && (
          <span className="text-[10px] text-muted-foreground">+{events.length - 3}</span>
        )}
      </div>
      <div className="space-y-0.5">
        {events.slice(0, 3).map((e) => (
          <div key={e.id} className={`text-[10px] rounded px-1 py-0.5 truncate leading-tight ${eventChipClass(e)}`} title={e.titulo}>
            {e.titulo}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaEventCard({ event }: { event: AgendaEvent }) {
  const chipCls  = eventChipClass(event);
  const tipoLabel =
    event.kind === "andamento"
      ? ANDAMENTO_TIPO_OPTIONS.find((o) => o.value === event.andamentoTipo)?.label ?? event.andamentoTipo
      : event.prioridade === "alta" ? "Prazo — Alta"
      : event.prioridade === "media" ? "Prazo — Média"
      : "Prazo — Baixa";

  return (
    <div className={`rounded-lg border p-3 space-y-1 ${event.kind === "prazo" && !event.concluido && event.prioridade === "alta" ? "border-destructive/30" : "border-border"}`}>
      <div className="flex items-center gap-2">
        <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${chipCls}`}>
          <AgendaEventIcon event={event} className="h-3.5 w-3.5" />
        </div>
        <span className={`text-xs font-semibold uppercase tracking-wide ${chipCls.split(" ")[1]}`}>{tipoLabel}</span>
        {event.processoNumero && (
          <Badge variant="outline" className="text-[10px] ml-auto">{event.processoNumero}</Badge>
        )}
      </div>
      <p className={`text-sm font-medium leading-snug ${event.concluido ? "line-through text-muted-foreground" : "text-foreground"}`}>
        {event.titulo}
      </p>
      {event.descricao && event.kind === "prazo" && (
        <p className="text-xs text-muted-foreground">{event.descricao}</p>
      )}
    </div>
  );
}

interface Prazo {
  id: string;
  titulo: string;
  data: string;
  tipo: string;
  prioridade: string;
  concluido: boolean;
  descricao: string | null;
  processo_id: string | null;
  processos?: {
    numero: string;
  } | null;
}

export default function Prazos() {
  const queryClient = useQueryClient();
  const { user }    = useAuth();
  const { escritorioId } = useWorkspace();
  const { data: prazos = [], isLoading: loading } = usePrazos();
  const deletePrazo = useDeletePrazo();
  const movePrazo   = useMovePrazo();
  const togglePrazo = useTogglePrazo();

  // ── Estado da aba Calendário (ex-Agenda) ──────────────────────────────────
  const [agendaMonth, setAgendaMonth]     = useState(new Date());
  const [agendaDay,   setAgendaDay]       = useState<Date | null>(null);
  const { data: agendaEvents = [], isLoading: agendaLoading } = useAgenda(agendaMonth);

  const agendaDays = useMemo(() =>
    eachDayOfInterval({ start: startOfMonth(agendaMonth), end: endOfMonth(agendaMonth) }),
  [agendaMonth]);
  const agendaPadding = startOfMonth(agendaMonth).getDay();

  const eventsForDay = (day: Date) =>
    agendaEvents.filter((e) => isSameDay(new Date(e.date + "T12:00:00"), day));

  const agendaDayEvents = agendaDay ? eventsForDay(agendaDay) : [];

  const agendaUpcoming = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return agendaEvents
      .filter((e) => e.date >= today && !(e.kind === "prazo" && e.concluido))
      .slice(0, 8);
  }, [agendaEvents]);

  const totalAgendaEvents  = agendaEvents.length;
  const agendaPendentes    = agendaEvents.filter((e) => e.kind === "prazo" && !e.concluido).length;
  const agendaAndamentos   = agendaEvents.filter((e) => e.kind === "andamento").length;
  const agendaVencidos     = agendaEvents.filter(
    (e) => e.kind === "prazo" && !e.concluido && isPast(new Date(e.date)) && !isToday(new Date(e.date)),
  ).length;

  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrazo, setEditingPrazo] = useState<Prazo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prazoToDelete, setPrazoToDelete] = useState<Prazo | null>(null);
  const [selectedPrazo, setSelectedPrazo] = useState<Prazo | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Drag and drop
  const [draggedPrazo, setDraggedPrazo] = useState<Prazo | null>(null);
  
  // Confirmação para mover prazos de alta prioridade
  const [moveConfirmOpen, setMoveConfirmOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ prazo: Prazo; targetDate: Date } | null>(null);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterPrioridade, setFilterPrioridade] = useState<string>("todas");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterPeriodo, setFilterPeriodo] = useState<string>("mes");
  const [selectedListDate, setSelectedListDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.prazos(escritorioId ?? '') });

  // Handle URL parameter for direct navigation from notifications
  useEffect(() => {
    const prazoId = searchParams.get("id");
    if (prazoId && prazos.length > 0) {
      const prazo = prazos.find(p => p.id === prazoId);
      if (prazo) {
        setSelectedPrazo(prazo);
        setDetailsDialogOpen(true);
        // Clear the URL parameter after opening
        setSearchParams({});
      }
    }
  }, [searchParams, prazos]);

  const handleDelete = async () => {
    if (!prazoToDelete) return;
    await deletePrazo.mutateAsync(prazoToDelete.id);
    setDeleteDialogOpen(false);
    setPrazoToDelete(null);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, prazo: Prazo) => {
    setDraggedPrazo(prazo);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", prazo.id);
  };

  const handleDragEnd = () => {
    setDraggedPrazo(null);
  };

  const executePrazoMove = async (prazo: Prazo, targetDate: Date) => {
    const newDateString = format(targetDate, "yyyy-MM-dd");
    await movePrazo.mutateAsync({ prazoId: prazo.id, newDate: newDateString });
    toast.success(`Prazo "${prazo.titulo}" movido para ${format(targetDate, "dd/MM/yyyy")}`);
    setDraggedPrazo(null);
  };

  const handleConfirmMove = async () => {
    if (pendingMove) {
      await executePrazoMove(pendingMove.prazo, pendingMove.targetDate);
    }
    setMoveConfirmOpen(false);
    setPendingMove(null);
  };

  const handleCancelMove = () => {
    setMoveConfirmOpen(false);
    setPendingMove(null);
    setDraggedPrazo(null);
  };

  // Get period range based on filter
  const getPeriodRange = () => {
    const baseDate = selectedListDate;
    switch (filterPeriodo) {
      case "dia":
        return { start: baseDate, end: baseDate };
      case "semana":
        return { 
          start: startOfWeek(baseDate, { weekStartsOn: 0 }), 
          end: endOfWeek(baseDate, { weekStartsOn: 0 }) 
        };
      case "mes":
      default:
        return { 
          start: startOfMonth(baseDate), 
          end: endOfMonth(baseDate) 
        };
    }
  };

  const periodRange = getPeriodRange();

  // Get period label
  const getPeriodLabel = () => {
    switch (filterPeriodo) {
      case "dia":
        return format(selectedListDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      case "semana":
        return `${format(periodRange.start, "dd/MM")} - ${format(periodRange.end, "dd/MM/yyyy")}`;
      case "mes":
      default:
        return format(selectedListDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
  };

  // Navigate period
  const navigatePeriod = (direction: "prev" | "next") => {
    const modifier = direction === "next" ? 1 : -1;
    switch (filterPeriodo) {
      case "dia":
        setSelectedListDate(addDays(selectedListDate, modifier));
        break;
      case "semana":
        setSelectedListDate(addWeeks(selectedListDate, modifier));
        break;
      case "mes":
      default:
        setSelectedListDate(new Date(selectedListDate.getFullYear(), selectedListDate.getMonth() + modifier, 1));
        break;
    }
  };

  // Apply filters to prazos
  const filteredPrazos = prazos.filter(p => {
    const statusMatch = filterStatus === "todos" || 
      (filterStatus === "pendente" && !p.concluido) || 
      (filterStatus === "concluido" && p.concluido);
    const prioridadeMatch = filterPrioridade === "todas" || p.prioridade === filterPrioridade;
    const tipoMatch = filterTipo === "todos" || normalizePrazoTipo(p.tipo) === filterTipo;
    
    // Period filter
    const prazoDate = parseISO(p.data);
    const periodMatch = isWithinInterval(prazoDate, { start: periodRange.start, end: periodRange.end });
    
    return statusMatch && prioridadeMatch && tipoMatch && periodMatch;
  });


  // Calcular estatísticas reais
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const prazosHoje = prazos.filter(p => {
    const prazoDate = parseISO(p.data);
    prazoDate.setHours(0, 0, 0, 0);
    return prazoDate.getTime() === today.getTime() && !p.concluido;
  }).length;

  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);
  
  const prazosProximos7Dias = prazos.filter(p => {
    const prazoDate = parseISO(p.data);
    prazoDate.setHours(0, 0, 0, 0);
    return prazoDate >= today && prazoDate <= sevenDaysFromNow && !p.concluido;
  }).length;

  const prazosConcluidos = prazos.filter(p => p.concluido).length;

  const prazosVencidos = prazos.filter(p => {
    const prazoDate = parseISO(p.data);
    prazoDate.setHours(0, 0, 0, 0);
    return prazoDate < today && !p.concluido;
  }).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Prazos</h1>
            <p className="text-muted-foreground">Controle todos os seus prazos e compromissos</p>
          </div>
          <Button className="gap-2" onClick={() => {
            setEditingPrazo(null);
            setFormOpen(true);
          }}>
            <Plus className="h-4 w-4" />
            Novo Prazo
          </Button>
        </div>

        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista" className="gap-2">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="calendario" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendário
            </TabsTrigger>
          </TabsList>

          {/* ── ABA LISTA ──────────────────────────────────────────────── */}
          <TabsContent value="lista" className="space-y-6 mt-4">

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold text-foreground">{prazosHoje}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CalendarIcon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Próximos 7 dias</p>
                <p className="text-2xl font-bold text-warning">{prazosProximos7Dias}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold text-destructive">{prazosVencidos}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Concluídos</p>
                <p className="text-2xl font-bold text-status-active">{prazosConcluidos}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-active/10">
                <FileText className="h-6 w-6 text-status-active" />
              </div>
            </div>
          </Card>
        </div>

        {/* Calendar */}
        <CalendarioPrazos
          prazos={prazos}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onPrazoClick={(prazo) => {
            setSelectedPrazo(prazo);
            setDetailsDialogOpen(true);
          }}
          onPrazoDrop={async (prazo, targetDate) => {
            const newDateString = format(targetDate, "yyyy-MM-dd");
            if (prazo.data === newDateString) return;
            
            if (prazo.prioridade === "alta") {
              setPendingMove({ prazo, targetDate });
              setMoveConfirmOpen(true);
              return;
            }
            
            await executePrazoMove(prazo, targetDate);
          }}
          onNewPrazo={(date) => {
            setEditingPrazo(null);
            // Could set a default date here if needed
            setFormOpen(true);
          }}
          draggedPrazo={draggedPrazo}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />

        {/* Upcoming Deadlines List */}
        <Card className="p-6 shadow-card">
          {/* Period Navigation */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">Lista de Prazos</h2>
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant={viewMode === "cards" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("cards")}
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={filterPeriodo === "dia" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterPeriodo("dia")}
                >
                  Dia
                </Button>
                <Button
                  variant={filterPeriodo === "semana" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterPeriodo("semana")}
                >
                  Semana
                </Button>
                <Button
                  variant={filterPeriodo === "mes" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterPeriodo("mes")}
                >
                  Mês
                </Button>
              </div>
            </div>

            {/* Period selector with navigation */}
            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
              <Button variant="ghost" size="icon" onClick={() => navigatePeriod("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="font-medium text-foreground capitalize">{getPeriodLabel()}</p>
                <p className="text-sm text-muted-foreground">
                  {filteredPrazos.length} prazo{filteredPrazos.length !== 1 ? 's' : ''} neste período
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => navigatePeriod("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Other filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="audiencia">Audiência</SelectItem>
                  <SelectItem value="prazo_processual">Prazo Processual</SelectItem>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedListDate(new Date())}
                className="text-primary"
              >
                Ir para hoje
              </Button>
            </div>
          </div>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredPrazos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {prazos.length === 0 ? "Nenhum prazo cadastrado" : "Nenhum prazo corresponde aos filtros selecionados"}
            </p>
          ) : viewMode === "cards" ? (
            <div className="space-y-3">
              {filteredPrazos.map(prazo => {
                const prazoDate = parseISO(prazo.data);
                return (
                  <div
                    key={prazo.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-gradient-card p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 flex-col items-center justify-center rounded-lg font-semibold ${
                        prazo.prioridade === 'alta'
                          ? 'bg-destructive/10 text-destructive'
                          : prazo.prioridade === 'media'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-success/10 text-success'
                      }`}>
                        <span className="text-xs">{format(prazoDate, 'MMM').toUpperCase()}</span>
                        <span className="text-lg">{format(prazoDate, 'dd')}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{prazo.titulo}</h3>
                        <p className="text-sm text-muted-foreground">
                          {prazo.processos?.numero ? `Processo: ${prazo.processos.numero}` : "Sem processo vinculado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={prazo.concluido ? "default" : "outline"}>
                        {prazo.concluido ? "Concluído" : prazo.tipo}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedPrazo(prazo);
                            setDetailsDialogOpen(true);
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setEditingPrazo(prazo);
                            setFormOpen(true);
                          }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setPrazoToDelete(prazo);
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
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Processo</TableHead>
                    <TableHead className="w-[70px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrazos.map(prazo => {
                    const prazoDate = parseISO(prazo.data);
                    const isVencido = isPast(prazoDate) && !isToday(prazoDate) && !prazo.concluido;
                    const isHoje = isToday(prazoDate) && !prazo.concluido;
                    
                    return (
                      <TableRow 
                        key={prazo.id}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          isVencido ? 'bg-destructive/5' : isHoje ? 'bg-warning/5' : ''
                        }`}
                        onClick={() => {
                          setSelectedPrazo(prazo);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={prazo.concluido}
                            onCheckedChange={(checked) =>
                              togglePrazo.mutate({ prazoId: prazo.id, concluido: !!checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{prazo.titulo}</TableCell>
                        <TableCell>
                          <span className={`${
                            isVencido ? 'text-destructive font-medium' : 
                            isHoje ? 'text-warning font-medium' : ''
                          }`}>
                            {format(prazoDate, "dd/MM/yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {prazo.tipo === 'prazo_processual' ? 'Processual' : 
                             prazo.tipo === 'audiencia' ? 'Audiência' :
                             prazo.tipo === 'reuniao' ? 'Reunião' : 'Outro'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              prazo.prioridade === 'alta' ? 'destructive' :
                              prazo.prioridade === 'media' ? 'secondary' : 'default'
                            }
                            className="text-xs"
                          >
                            {prazo.prioridade === 'alta' ? 'Alta' :
                             prazo.prioridade === 'media' ? 'Média' : 'Baixa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {prazo.processos?.numero || '-'}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedPrazo(prazo);
                                setDetailsDialogOpen(true);
                              }}>
                                <FileText className="h-4 w-4 mr-2" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingPrazo(prazo);
                                setFormOpen(true);
                              }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setPrazoToDelete(prazo);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

          </TabsContent>

          {/* ── ABA CALENDÁRIO (ex-Agenda) ─────────────────────────── */}
          <TabsContent value="calendario" className="space-y-6 mt-4">
            {/* Navegação do mês */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setAgendaMonth(new Date()); setAgendaDay(new Date()); }}>
                  Hoje
                </Button>
                <Button variant="outline" size="icon" onClick={() => { setAgendaMonth((m) => subMonths(m, 1)); setAgendaDay(null); }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-base font-semibold capitalize min-w-[160px] text-center">
                  {format(agendaMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
                <Button variant="outline" size="icon" onClick={() => { setAgendaMonth((m) => addMonths(m, 1)); setAgendaDay(null); }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {/* Legenda */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                {[
                  { cls: "bg-red-100 text-red-700",       label: "Prazo alta" },
                  { cls: "bg-amber-100 text-amber-700",   label: "Prazo média" },
                  { cls: "bg-blue-50 text-blue-700",      label: "Prazo baixa" },
                  { cls: "bg-blue-100 text-blue-700",     label: "Audiência" },
                  { cls: "bg-purple-100 text-purple-700", label: "Decisão" },
                  { cls: "bg-green-100 text-green-700",   label: "Acordo" },
                ].map(({ cls, label }) => (
                  <span key={label} className={`px-2 py-0.5 rounded ${cls}`}>{label}</span>
                ))}
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: totalAgendaEvents, label: "Total este mês",   icon: CalendarIcon, color: "text-primary" },
                { value: agendaPendentes,   label: "Prazos pendentes", icon: Clock,        color: "text-amber-600" },
                { value: agendaAndamentos,  label: "Andamentos",       icon: FileText,     color: "text-blue-600" },
                { value: agendaVencidos,    label: "Prazos vencidos",  icon: AlertCircle,  color: "text-destructive" },
              ].map(({ value, label, icon: Icon, color }) => (
                <Card key={label} className="p-4 shadow-card">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${color}`} />
                    <div>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Grade + painel do dia */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
              <Card className="p-4 shadow-card overflow-hidden">
                <div className="grid grid-cols-7 mb-2">
                  {WEEK_LABELS.map((l) => (
                    <div key={l} className="text-center text-xs font-medium text-muted-foreground py-2">{l}</div>
                  ))}
                </div>
                {agendaLoading ? (
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-[90px] rounded-lg" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: agendaPadding }).map((_, i) => <div key={`pad-${i}`} className="min-h-[90px]" />)}
                    {agendaDays.map((day) => (
                      <AgendaDayCell
                        key={day.toISOString()}
                        day={day}
                        events={eventsForDay(day)}
                        isSelected={!!agendaDay && isSameDay(day, agendaDay)}
                        onClick={() => setAgendaDay((prev) => prev && isSameDay(prev, day) ? null : day)}
                      />
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4 shadow-card">
                <ScrollArea className="h-[560px] pr-2">
                  {agendaLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
                    </div>
                  ) : agendaDay ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-base font-semibold text-foreground capitalize">
                          {format(agendaDay, "EEEE", { locale: ptBR })}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {format(agendaDay, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      {agendaDayEvents.length === 0
                        ? <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
                        : agendaDayEvents.map((e) => <AgendaEventCard key={e.id} event={e} />)
                      }
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Próximos eventos
                      </h3>
                      {agendaUpcoming.length === 0
                        ? <p className="text-sm text-muted-foreground">Nenhum evento futuro.</p>
                        : agendaUpcoming.map((e) => <AgendaEventCard key={e.id} event={e} />)
                      }
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>

      <PrazoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={invalidate}
        prazo={editingPrazo}
      />

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes do Prazo
            </DialogTitle>
          </DialogHeader>
          
          {selectedPrazo && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{selectedPrazo.titulo}</h3>
                <div className="flex gap-2">
                  <Badge variant={
                    selectedPrazo.prioridade === 'alta' ? 'destructive' :
                    selectedPrazo.prioridade === 'media' ? 'secondary' : 'default'
                  }>
                    {selectedPrazo.prioridade === 'alta' ? 'Alta Prioridade' :
                     selectedPrazo.prioridade === 'media' ? 'Média Prioridade' : 'Baixa Prioridade'}
                  </Badge>
                  <Badge variant="outline">{selectedPrazo.tipo}</Badge>
                  <Badge variant={selectedPrazo.concluido ? 'default' : 'secondary'}>
                    {selectedPrazo.concluido ? 'Concluído' : 'Pendente'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Data</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(selectedPrazo.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {selectedPrazo.processos?.numero && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Processo Vinculado</p>
                      <p className="text-sm text-muted-foreground">{selectedPrazo.processos.numero}</p>
                    </div>
                  </div>
                )}

                {selectedPrazo.descricao && (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Descrição</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedPrazo.descricao}</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    setEditingPrazo(selectedPrazo);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    setPrazoToDelete(selectedPrazo);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o prazo "{prazoToDelete?.titulo}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação para mover prazo de alta prioridade */}
      <AlertDialog open={moveConfirmOpen} onOpenChange={setMoveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Mover prazo de alta prioridade
            </AlertDialogTitle>
            <AlertDialogDescription>
              O prazo <strong>"{pendingMove?.prazo.titulo}"</strong> possui <span className="text-destructive font-semibold">prioridade alta</span>. 
              <br /><br />
              Deseja realmente movê-lo de{" "}
              <strong>{pendingMove?.prazo.data && format(parseISO(pendingMove.prazo.data), "dd/MM/yyyy")}</strong>{" "}
              para{" "}
              <strong>{pendingMove?.targetDate && format(pendingMove.targetDate, "dd/MM/yyyy")}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelMove}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMove}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
