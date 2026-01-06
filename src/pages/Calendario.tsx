import { useState, useEffect, useMemo, DragEvent } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, Clock, CheckCircle2, GripVertical } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isPast, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

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

export default function Calendario() {
  const [prazos, setPrazos] = useState<Prazo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draggedPrazo, setDraggedPrazo] = useState<Prazo | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPrazos();
  }, []);

  const fetchPrazos = async () => {
    try {
      const { data, error } = await supabase
        .from("prazos")
        .select("*, processos!fk_prazos_processo(numero)")
        .order("data", { ascending: true });

      if (error) throw error;
      setPrazos(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar prazos");
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    const startDay = start.getDay();
    const paddingStart = Array(startDay).fill(null);

    return [...paddingStart, ...days];
  }, [currentDate]);

  const getPrazosForDay = (date: Date) => {
    return prazos.filter((prazo) => isSameDay(new Date(prazo.data), date));
  };

  const getPrazoStatusColor = (prazo: Prazo) => {
    if (prazo.concluido) return "bg-muted text-muted-foreground";
    const prazoDate = new Date(prazo.data);
    if (isPast(prazoDate) && !isToday(prazoDate)) return "bg-destructive text-destructive-foreground";
    if (isToday(prazoDate)) return "bg-warning text-warning-foreground";
    return "bg-primary text-primary-foreground";
  };

  const getPrioridadeColor = (prioridade: string) => {
    const colors: Record<string, string> = {
      alta: "border-l-destructive",
      media: "border-l-warning",
      baixa: "border-l-muted-foreground",
    };
    return colors[prioridade] || colors.media;
  };

  const handleDayClick = (date: Date) => {
    const dayPrazos = getPrazosForDay(date);
    if (dayPrazos.length > 0) {
      setSelectedDate(date);
      setDialogOpen(true);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, prazo: Prazo) => {
    setDraggedPrazo(prazo);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", prazo.id);
  };

  const handleDragEnd = () => {
    setDraggedPrazo(null);
    setDragOverDate(null);
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

    if (!draggedPrazo) return;

    const newDateString = format(targetDate, "yyyy-MM-dd");
    
    if (draggedPrazo.data === newDateString) {
      setDraggedPrazo(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("prazos")
        .update({ data: newDateString })
        .eq("id", draggedPrazo.id);

      if (error) throw error;

      // Update local state immediately
      setPrazos((prev) =>
        prev.map((p) =>
          p.id === draggedPrazo.id ? { ...p, data: newDateString } : p
        )
      );

      toast.success(`Prazo "${draggedPrazo.titulo}" movido para ${format(targetDate, "dd/MM/yyyy")}`);
    } catch (error: any) {
      toast.error("Erro ao atualizar data do prazo");
    } finally {
      setDraggedPrazo(null);
    }
  };

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const selectedDayPrazos = selectedDate ? getPrazosForDay(selectedDate) : [];

  // Estatísticas do mês
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const monthPrazos = prazos.filter((p) => {
      const date = new Date(p.data);
      return date >= monthStart && date <= monthEnd;
    });

    const total = monthPrazos.length;
    const concluidos = monthPrazos.filter((p) => p.concluido).length;
    const vencidos = monthPrazos.filter((p) => !p.concluido && isPast(new Date(p.data)) && !isToday(new Date(p.data))).length;
    const pendentes = monthPrazos.filter((p) => !p.concluido && !isPast(new Date(p.data))).length;

    return { total, concluidos, vencidos, pendentes };
  }, [prazos, currentDate]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendário</h1>
            <p className="text-muted-foreground">Visualize todos os seus prazos no calendário</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/prazos")}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Ver lista de prazos
          </Button>
        </div>

        {/* Stats do mês */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4 shadow-card">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{monthStats.total}</p>
              <p className="text-sm text-muted-foreground">Total do mês</p>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="text-center">
              <p className="text-2xl font-bold text-status-active">{monthStats.concluidos}</p>
              <p className="text-sm text-muted-foreground">Concluídos</p>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{monthStats.vencidos}</p>
              <p className="text-sm text-muted-foreground">Vencidos</p>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{monthStats.pendentes}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </Card>
        </div>

        {/* Calendar */}
        <Card className="p-6 shadow-card">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold text-foreground capitalize">
                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
              </h2>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : (
            <>
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="min-h-[100px]" />;
                  }

                  const dayPrazos = getPrazosForDay(day);
                  const hasVencidos = dayPrazos.some((p) => !p.concluido && isPast(new Date(p.data)) && !isToday(new Date(p.data)));
                  const isDragOver = dragOverDate && isSameDay(dragOverDate, day);

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => handleDayClick(day)}
                      onDragOver={(e) => handleDragOver(e, day)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day)}
                      className={`
                        min-h-[100px] p-2 border rounded-lg transition-all
                        ${!isSameMonth(day, currentDate) ? "opacity-50" : ""}
                        ${isToday(day) ? "border-primary border-2 bg-primary/5" : "border-border"}
                        ${dayPrazos.length > 0 ? "cursor-pointer hover:bg-accent/50" : ""}
                        ${hasVencidos ? "bg-destructive/10" : ""}
                        ${isDragOver ? "border-primary border-2 bg-primary/20 scale-[1.02]" : ""}
                      `}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday(day) ? "text-primary" : "text-foreground"}`}>
                        {format(day, "d")}
                      </div>
                      <div className="space-y-1">
                        {dayPrazos.slice(0, 3).map((prazo) => (
                          <div
                            key={prazo.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, prazo)}
                            onDragEnd={handleDragEnd}
                            className={`text-xs px-1.5 py-0.5 rounded truncate cursor-grab active:cursor-grabbing flex items-center gap-1 ${getPrazoStatusColor(prazo)} ${
                              draggedPrazo?.id === prazo.id ? "opacity-50" : ""
                            }`}
                            title={`${prazo.titulo} - Arraste para alterar a data`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="h-3 w-3 shrink-0 opacity-60" />
                            <span className="truncate">{prazo.titulo}</span>
                          </div>
                        ))}
                        {dayPrazos.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{dayPrazos.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Legenda */}
        <Card className="p-4 shadow-card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Legenda</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-destructive" />
                  <span className="text-sm text-muted-foreground">Vencido</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-warning" />
                  <span className="text-sm text-muted-foreground">Vence hoje</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-primary" />
                  <span className="text-sm text-muted-foreground">Pendente</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-muted" />
                  <span className="text-sm text-muted-foreground">Concluído</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              <GripVertical className="h-4 w-4" />
              <span>Arraste os prazos para alterar as datas</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Dialog para detalhes do dia */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Prazos de {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {selectedDayPrazos.map((prazo) => (
              <div
                key={prazo.id}
                className={`p-3 rounded-lg border border-l-4 ${getPrioridadeColor(prazo.prioridade)} bg-card`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {prazo.concluido ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      ) : isPast(new Date(prazo.data)) && !isToday(new Date(prazo.data)) ? (
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-warning shrink-0" />
                      )}
                      <span className={`font-medium ${prazo.concluido ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {prazo.titulo}
                      </span>
                    </div>
                    {prazo.descricao && (
                      <p className="text-sm text-muted-foreground mt-1 ml-6">{prazo.descricao}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 ml-6">
                      <Badge variant="outline" className="text-xs">
                        {prazo.tipo}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          prazo.prioridade === "alta"
                            ? "border-destructive text-destructive"
                            : prazo.prioridade === "media"
                            ? "border-warning text-warning"
                            : ""
                        }`}
                      >
                        {prazo.prioridade}
                      </Badge>
                      {prazo.processos && (
                        <span className="text-xs text-muted-foreground">
                          Processo: {prazo.processos.numero}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => navigate("/prazos")}>
              Gerenciar prazos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
