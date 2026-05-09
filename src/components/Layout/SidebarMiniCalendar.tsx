import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isPast, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

interface Prazo {
  id: string;
  titulo: string;
  data: string;
  prioridade: string;
  concluido: boolean;
}

export function SidebarMiniCalendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [prazos, setPrazos] = useState<Prazo[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (user) fetchPrazos();
  }, [user, currentMonth]);

  const fetchPrazos = async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    const { data } = await supabase
      .from("prazos")
      .select("id, titulo, data, prioridade, concluido")
      .eq("user_id", user?.id)
      .gte("data", format(start, "yyyy-MM-dd"))
      .lte("data", format(end, "yyyy-MM-dd"))
      .order("data", { ascending: true });

    setPrazos(data || []);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

  const getPrazosForDay = (date: Date) => {
    return prazos.filter((p) => isSameDay(new Date(p.data), date));
  };

  const getDayStatus = (date: Date) => {
    const dayPrazos = getPrazosForDay(date);
    if (dayPrazos.length === 0) return null;
    
    const pendingPrazos = dayPrazos.filter(p => !p.concluido);
    if (pendingPrazos.length === 0) return "completed";
    
    const hasOverdue = pendingPrazos.some(p => isPast(new Date(p.data)) && !isToday(new Date(p.data)));
    if (hasOverdue) return "overdue";
    
    const hasHigh = pendingPrazos.some(p => p.prioridade === "alta");
    if (hasHigh) return "high";
    
    return "normal";
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "overdue": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-warning text-warning-foreground";
      case "completed": return "bg-muted text-muted-foreground";
      case "normal": return "bg-primary text-primary-foreground";
      default: return "";
    }
  };

  const startPadding = startOfMonth(currentMonth).getDay();

  const selectedPrazos = selectedDate ? getPrazosForDay(selectedDate) : [];

  const proximosPrazos = prazos
    .filter(p => !p.concluido && new Date(p.data) >= new Date())
    .slice(0, 3);

  return (
    <div className="p-3 space-y-3">
      {/* Header com navegação */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendário */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {weekDays.map((day, i) => (
          <div key={i} className="text-[10px] font-medium text-muted-foreground py-1">
            {day}
          </div>
        ))}
        
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} className="h-6" />
        ))}
        
        {days.map((day) => {
          const status = getDayStatus(day);
          const dayPrazos = getPrazosForDay(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          
          return (
            <TooltipProvider key={day.toISOString()}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`
                      h-6 w-6 text-[10px] rounded-full flex items-center justify-center
                      transition-all relative
                      ${isToday(day) ? "ring-1 ring-primary ring-offset-1" : ""}
                      ${isSelected ? "ring-2 ring-primary" : ""}
                      ${status ? getStatusColor(status) : "hover:bg-muted"}
                    `}
                  >
                    {format(day, "d")}
                    {dayPrazos.length > 1 && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary text-[8px] text-primary-foreground flex items-center justify-center">
                        {dayPrazos.length}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                {dayPrazos.length > 0 && (
                  <TooltipContent side="right" className="max-w-[200px]">
                    <div className="space-y-1">
                      {dayPrazos.map(p => (
                        <div key={p.id} className="text-xs">
                          <span className={p.concluido ? "line-through text-muted-foreground" : ""}>
                            {p.titulo}
                          </span>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {/* Lista de prazos selecionados */}
      {selectedDate && selectedPrazos.length > 0 && (
        <div className="border-t pt-2 space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground">
            {format(selectedDate, "dd/MM")}:
          </p>
          <ScrollArea className="max-h-20">
            {selectedPrazos.map(p => (
              <div 
                key={p.id} 
                className={`text-[10px] py-0.5 ${p.concluido ? "line-through text-muted-foreground" : ""}`}
              >
                • {p.titulo}
              </div>
            ))}
          </ScrollArea>
        </div>
      )}

      {/* Próximos prazos */}
      {!selectedDate && proximosPrazos.length > 0 && (
        <div className="border-t pt-2 space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Clock className="h-3 w-3" />
            Próximos
          </div>
          <ScrollArea className="max-h-16">
            {proximosPrazos.map(p => (
              <div key={p.id} className="flex items-center gap-1 text-[10px] py-0.5">
                {p.prioridade === "alta" && <AlertCircle className="h-2.5 w-2.5 text-destructive" />}
                <span className="truncate flex-1">{p.titulo}</span>
                <Badge variant="outline" className="h-4 text-[8px] px-1">
                  {format(new Date(p.data), "dd/MM")}
                </Badge>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}

      {/* Link para página de prazos */}
      <Link 
        to="/prazos" 
        className="block text-center text-[10px] text-primary hover:underline pt-1"
      >
        Ver todos os prazos →
      </Link>
    </div>
  );
}
