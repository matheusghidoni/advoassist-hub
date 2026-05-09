import { DragEvent, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, GripVertical, Plus, Eye } from "lucide-react";
import {
  format,
  isSameDay,
  isPast,
  isToday,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getPrazoPrioridadeLabel, getPrazoTipoLabel } from "@/lib/prazoOptions";

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

interface CalendarioPrazosProps {
  prazos: Prazo[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onPrazoClick: (prazo: Prazo) => void;
  onPrazoDrop: (prazo: Prazo, targetDate: Date) => Promise<void>;
  onNewPrazo: (date?: Date) => void;
  draggedPrazo: Prazo | null;
  onDragStart: (e: DragEvent<HTMLDivElement>, prazo: Prazo) => void;
  onDragEnd: () => void;
}

export function CalendarioPrazos({
  prazos,
  currentDate,
  onDateChange,
  onPrazoClick,
  onPrazoDrop,
  onNewPrazo,
  draggedPrazo,
  onDragStart,
  onDragEnd,
}: CalendarioPrazosProps) {
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });

  const days =
    viewMode === "month"
      ? eachDayOfInterval({ start: calendarStart, end: calendarEnd })
      : eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const previousPeriod = () => {
    if (viewMode === "month") {
      onDateChange(subMonths(currentDate, 1));
    } else {
      onDateChange(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    }
  };

  const nextPeriod = () => {
    if (viewMode === "month") {
      onDateChange(addMonths(currentDate, 1));
    } else {
      onDateChange(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    }
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const getPrazosForDay = (day: Date) => {
    return prazos.filter((prazo) => isSameDay(parseISO(prazo.data), day));
  };

  const getPrazoStatusColor = (prazo: Prazo) => {
    if (prazo.concluido) return "bg-muted text-muted-foreground border-muted";
    const prazoDate = parseISO(prazo.data);
    if (isPast(prazoDate) && !isToday(prazoDate)) {
      return "bg-destructive text-destructive-foreground border-destructive";
    }
    if (isToday(prazoDate)) return "bg-warning text-warning-foreground border-warning";
    return "bg-primary text-primary-foreground border-primary";
  };

  const getPriorityIndicator = (prioridade: string) => {
    switch (prioridade) {
      case "alta":
        return "border-l-4 border-l-destructive";
      case "media":
        return "border-l-4 border-l-warning";
      case "baixa":
        return "border-l-4 border-l-success";
      default:
        return "";
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetDate: Date) => {
    e.preventDefault();
    setDragOverDate(null);

    if (draggedPrazo) {
      await onPrazoDrop(draggedPrazo, targetDate);
    }
  };

  const periodLabel =
    viewMode === "month"
      ? format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
      : `${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM/yyyy")}`;

  return (
    <Card className="overflow-hidden p-4 shadow-card md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="outline" size="icon" onClick={previousPeriod}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[180px] text-center text-lg font-semibold capitalize text-foreground md:min-w-[220px] md:text-xl">
            {periodLabel}
          </h2>
          <Button variant="outline" size="icon" onClick={nextPeriod}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-lg border">
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("month")}
              className="rounded-none"
            >
              Mês
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="rounded-none"
            >
              Semana
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="rounded-t-lg bg-muted/30 p-2 text-center text-xs font-semibold text-muted-foreground md:text-sm"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}

        {days.map((day) => {
          const dayPrazos = getPrazosForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDay = isToday(day);
          const hasVencidos = dayPrazos.some(
            (prazo) => !prazo.concluido && isPast(parseISO(prazo.data)) && !isToday(parseISO(prazo.data))
          );
          const isDragOver = dragOverDate && isSameDay(dragOverDate, day);
          const maxVisiblePrazos = viewMode === "week" ? 5 : 3;

          return (
            <div
              key={day.toISOString()}
              onDragOver={(e) => handleDragOver(e, day)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
              className={`
                ${viewMode === "week" ? "min-h-40 md:min-h-48" : "min-h-24 md:min-h-28"}
                group relative rounded-lg border p-1.5 transition-all md:p-2
                ${!isCurrentMonth && viewMode === "month" ? "bg-muted/20 opacity-50" : "bg-card"}
                ${isTodayDay ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}
                ${hasVencidos ? "bg-destructive/5" : ""}
                ${isDragOver ? "scale-[1.02] border-primary bg-primary/10 shadow-lg" : ""}
              `}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`
                    text-xs font-semibold md:text-sm
                    ${isTodayDay ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground md:h-7 md:w-7" : "text-foreground"}
                    ${!isCurrentMonth && viewMode === "month" ? "text-muted-foreground" : ""}
                  `}
                >
                  {format(day, "d")}
                </span>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100 md:h-6 md:w-6"
                      onClick={() => onNewPrazo(day)}
                    >
                      <Plus className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adicionar prazo em {format(day, "dd/MM")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="space-y-0.5 md:space-y-1">
                {dayPrazos.slice(0, maxVisiblePrazos).map((prazo) => (
                  <Tooltip key={prazo.id}>
                    <TooltipTrigger asChild>
                      <div
                        draggable
                        onDragStart={(e) => onDragStart(e, prazo)}
                        onDragEnd={onDragEnd}
                        onClick={() => onPrazoClick(prazo)}
                        className={`
                          flex cursor-grab items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium shadow-sm transition-all hover:scale-[1.02] active:cursor-grabbing md:gap-1 md:px-1.5 md:text-xs
                          ${getPrazoStatusColor(prazo)}
                          ${getPriorityIndicator(prazo.prioridade)}
                          ${draggedPrazo?.id === prazo.id ? "scale-95 opacity-50" : ""}
                        `}
                      >
                        <GripVertical className="h-2.5 w-2.5 shrink-0 opacity-60 md:h-3 md:w-3" />
                        <span className="flex-1 truncate">{prazo.titulo}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[250px]">
                      <div className="space-y-1">
                        <p className="font-semibold">{prazo.titulo}</p>
                        <div className="flex gap-2 text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {getPrazoTipoLabel(prazo.tipo)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              prazo.prioridade === "alta"
                                ? "border-destructive text-destructive"
                                : prazo.prioridade === "media"
                                  ? "border-warning text-warning"
                                  : "border-success text-success"
                            }`}
                          >
                            {getPrazoPrioridadeLabel(prazo.prioridade)}
                          </Badge>
                        </div>
                        {prazo.processos?.numero && (
                          <p className="text-xs text-muted-foreground">Processo: {prazo.processos.numero}</p>
                        )}
                        {prazo.descricao && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">{prazo.descricao}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}

                {dayPrazos.length > maxVisiblePrazos && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex w-full items-center justify-center gap-1 rounded py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/5 hover:text-primary/80 md:text-xs">
                        <Eye className="h-3 w-3" />+{dayPrazos.length - maxVisiblePrazos} mais
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="start">
                      <div className="space-y-2">
                        <h4 className="mb-2 text-sm font-semibold">
                          Prazos em {format(day, "dd 'de' MMMM", { locale: ptBR })}
                        </h4>
                        <div className="max-h-60 space-y-1.5 overflow-y-auto">
                          {dayPrazos.map((prazo) => (
                            <div
                              key={prazo.id}
                              onClick={() => onPrazoClick(prazo)}
                              className={`
                                cursor-pointer rounded p-2 transition-all hover:scale-[1.01]
                                ${getPrazoStatusColor(prazo)} ${getPriorityIndicator(prazo.prioridade)}
                              `}
                            >
                              <p className="text-sm font-medium">{prazo.titulo}</p>
                              <div className="mt-1 flex gap-1.5">
                                <Badge variant="secondary" className="text-[10px]">
                                  {getPrazoTipoLabel(prazo.tipo)}
                                </Badge>
                                {prazo.processos?.numero && (
                                  <span className="text-[10px] opacity-80">{prazo.processos.numero}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-4 border-t pt-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs md:gap-4">
          <span className="font-medium text-muted-foreground">Legenda:</span>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded border border-muted-foreground/20 bg-muted"></div>
            <span className="text-muted-foreground">Concluído</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-primary"></div>
            <span className="text-muted-foreground">Pendente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-warning"></div>
            <span className="text-muted-foreground">Vence hoje</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-destructive"></div>
            <span className="text-muted-foreground">Vencido</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-muted-foreground">
            <GripVertical className="h-4 w-4" />
            <span>Arraste para alterar datas</span>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <span className="text-muted-foreground">Prioridade:</span>
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-1 rounded bg-destructive"></div>
              <span className="text-muted-foreground">Alta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-1 rounded bg-warning"></div>
              <span className="text-muted-foreground">Média</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-1 rounded bg-success"></div>
              <span className="text-muted-foreground">Baixa</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
