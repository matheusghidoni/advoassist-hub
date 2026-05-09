import { useMemo, useState } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  format,
  isPast,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Gavel,
  Scale,
  FileText,
  BookOpen,
  CornerUpRight,
  Bell,
  Handshake,
  Send,
  HelpCircle,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgenda, type AgendaEvent } from "@/hooks/queries/useAgendaQuery";
import { ANDAMENTO_TIPO_OPTIONS } from "@/hooks/queries/useAndamentosQuery";

// ── Styling helpers ──────────────────────────────────────────────────────────

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

const fallbackAndamento = { icon: FileText, chip: "bg-muted text-muted-foreground" };

function eventChipClass(event: AgendaEvent): string {
  if (event.kind === "prazo") {
    if (event.concluido) return "bg-muted text-muted-foreground line-through";
    if (event.prioridade === "alta")  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    if (event.prioridade === "media") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  }
  return (ANDAMENTO_META[event.andamentoTipo ?? ""] ?? fallbackAndamento).chip;
}

function EventIcon({ event, className }: { event: AgendaEvent; className?: string }) {
  if (event.kind === "prazo") {
    if (event.concluido) return <CheckCircle2 className={className} />;
    if (event.prioridade === "alta") return <AlertCircle className={className} />;
    return <Clock className={className} />;
  }
  const Meta = ANDAMENTO_META[event.andamentoTipo ?? ""] ?? fallbackAndamento;
  const Icon = Meta.icon;
  return <Icon className={className} />;
}

// ── Day cell ─────────────────────────────────────────────────────────────────

interface DayCellProps {
  day: Date;
  events: AgendaEvent[];
  isSelected: boolean;
  onClick: () => void;
}

function DayCell({ day, events, isSelected, onClick }: DayCellProps) {
  const todayStyle  = isToday(day) ? "ring-2 ring-primary ring-offset-1" : "";
  const selectStyle = isSelected  ? "bg-primary/10" : "hover:bg-muted/60";
  const hasOverdue  = events.some(
    (e) => e.kind === "prazo" && !e.concluido && isPast(new Date(e.date)) && !isToday(new Date(e.date)),
  );

  return (
    <div
      onClick={onClick}
      className={`min-h-[90px] p-1.5 cursor-pointer rounded-lg border border-border transition-colors ${selectStyle} ${hasOverdue ? "border-destructive/40" : ""}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-semibold h-6 w-6 flex items-center justify-center rounded-full ${
            isToday(day)
              ? "bg-primary text-primary-foreground"
              : isSelected
              ? "text-primary"
              : "text-foreground"
          } ${todayStyle}`}
        >
          {format(day, "d")}
        </span>
        {events.length > 3 && (
          <span className="text-[10px] text-muted-foreground">+{events.length - 3}</span>
        )}
      </div>

      <div className="space-y-0.5">
        {events.slice(0, 3).map((event) => (
          <div
            key={event.id}
            className={`text-[10px] rounded px-1 py-0.5 truncate leading-tight ${eventChipClass(event)}`}
            title={event.titulo}
          >
            {event.titulo}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Day detail panel ─────────────────────────────────────────────────────────

interface DayPanelProps {
  selectedDay: Date | null;
  events: AgendaEvent[];
  upcomingEvents: AgendaEvent[];
}

function DayPanel({ selectedDay, events, upcomingEvents }: DayPanelProps) {
  if (!selectedDay) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Próximos eventos
        </h3>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento futuro.</p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground capitalize">
          {format(selectedDay, "EEEE", { locale: ptBR })}
        </h3>
        <p className="text-sm text-muted-foreground">
          {format(selectedDay, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: AgendaEvent }) {
  const chipCls = eventChipClass(event);
  const tipoLabel =
    event.kind === "andamento"
      ? ANDAMENTO_TIPO_OPTIONS.find((o) => o.value === event.andamentoTipo)?.label ?? event.andamentoTipo
      : event.prioridade === "alta"
      ? "Prazo — Alta"
      : event.prioridade === "media"
      ? "Prazo — Média"
      : "Prazo — Baixa";

  return (
    <div className={`rounded-lg border p-3 space-y-1 ${event.kind === "prazo" && !event.concluido && event.prioridade === "alta" ? "border-destructive/30" : "border-border"}`}>
      <div className="flex items-center gap-2">
        <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${chipCls}`}>
          <EventIcon event={event} className="h-3.5 w-3.5" />
        </div>
        <span className={`text-xs font-semibold uppercase tracking-wide ${chipCls.split(" ")[1]}`}>
          {tipoLabel}
        </span>
        {event.processoNumero && (
          <Badge variant="outline" className="text-[10px] ml-auto">
            {event.processoNumero}
          </Badge>
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

// ── Page ─────────────────────────────────────────────────────────────────────

const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Agenda() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay]   = useState<Date | null>(null);

  const { data: events = [], isLoading } = useAgenda(currentMonth);

  const days = useMemo(() =>
    eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end:   endOfMonth(currentMonth),
    }),
  [currentMonth]);

  const paddingCells = startOfMonth(currentMonth).getDay(); // 0 = Sunday

  const eventsForDay = (day: Date): AgendaEvent[] =>
    events.filter((e) => isSameDay(new Date(e.date + "T12:00:00"), day));

  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : [];

  const upcomingEvents = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return events
      .filter((e) => e.date >= today && !(e.kind === "prazo" && e.concluido))
      .slice(0, 8);
  }, [events]);

  const totalEvents    = events.length;
  const pendingPrazos  = events.filter((e) => e.kind === "prazo" && !e.concluido).length;
  const andamentos     = events.filter((e) => e.kind === "andamento").length;
  const overduePrazos  = events.filter(
    (e) => e.kind === "prazo" && !e.concluido && isPast(new Date(e.date)) && !isToday(new Date(e.date)),
  ).length;

  const goToday = () => {
    setCurrentMonth(new Date());
    setSelectedDay(new Date());
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground">Prazos e andamentos num único calendário</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToday}>
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => { setCurrentMonth((m) => subMonths(m, 1)); setSelectedDay(null); }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-base font-semibold capitalize min-w-[160px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => { setCurrentMonth((m) => addMonths(m, 1)); setSelectedDay(null); }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { value: totalEvents,   label: "Total este mês",  icon: Calendar,      color: "text-primary" },
            { value: pendingPrazos, label: "Prazos pendentes", icon: Clock,        color: "text-amber-600" },
            { value: andamentos,    label: "Andamentos",       icon: FileText,     color: "text-blue-600" },
            { value: overduePrazos, label: "Prazos vencidos",  icon: AlertCircle,  color: "text-destructive" },
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

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium">Legenda:</span>
          {[
            { cls: "bg-red-100 text-red-700",    label: "Prazo alta" },
            { cls: "bg-amber-100 text-amber-700", label: "Prazo média" },
            { cls: "bg-blue-50 text-blue-700",   label: "Prazo baixa" },
            { cls: "bg-blue-100 text-blue-700",  label: "Audiência" },
            { cls: "bg-purple-100 text-purple-700", label: "Decisão" },
            { cls: "bg-green-100 text-green-700",label: "Acordo" },
          ].map(({ cls, label }) => (
            <span key={label} className={`px-2 py-0.5 rounded text-xs ${cls}`}>{label}</span>
          ))}
        </div>

        {/* Calendar + Day panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Month grid */}
          <Card className="p-4 shadow-card overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEK_LABELS.map((label) => (
                <div key={label} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {label}
                </div>
              ))}
            </div>

            {/* Day cells */}
            {isLoading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-[90px] rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Leading padding */}
                {Array.from({ length: paddingCells }).map((_, i) => (
                  <div key={`pad-${i}`} className="min-h-[90px]" />
                ))}

                {days.map((day) => (
                  <DayCell
                    key={day.toISOString()}
                    day={day}
                    events={eventsForDay(day)}
                    isSelected={!!selectedDay && isSameDay(day, selectedDay)}
                    onClick={() =>
                      setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day))
                    }
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Day panel */}
          <Card className="p-4 shadow-card">
            <ScrollArea className="h-[560px] pr-2">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : (
                <DayPanel
                  selectedDay={selectedDay}
                  events={selectedDayEvents}
                  upcomingEvents={upcomingEvents}
                />
              )}
            </ScrollArea>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
