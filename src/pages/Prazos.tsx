import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Pencil, Trash2, MoreVertical, FileText, AlertCircle, Filter, GripVertical } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, DragEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PrazoForm } from "@/components/Prazos/PrazoForm";
import { format, parseISO, isSameDay, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [prazos, setPrazos] = useState<Prazo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrazo, setEditingPrazo] = useState<Prazo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prazoToDelete, setPrazoToDelete] = useState<Prazo | null>(null);
  const [selectedPrazo, setSelectedPrazo] = useState<Prazo | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Drag and drop
  const [draggedPrazo, setDraggedPrazo] = useState<Prazo | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterPrioridade, setFilterPrioridade] = useState<string>("todas");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  useEffect(() => {
    fetchPrazos();
  }, []);

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

  const fetchPrazos = async () => {
    try {
      const { data, error } = await supabase
        .from("prazos")
        .select("*, processos!prazos_processo_id_fkey(numero)")
        .order("data");
      
      if (error) throw error;
      setPrazos(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar prazos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!prazoToDelete) return;
    
    try {
      const { error } = await supabase
        .from("prazos")
        .delete()
        .eq("id", prazoToDelete.id);
      
      if (error) throw error;
      toast.success("Prazo excluído com sucesso!");
      fetchPrazos();
    } catch (error: any) {
      toast.error("Erro ao excluir prazo");
    } finally {
      setDeleteDialogOpen(false);
      setPrazoToDelete(null);
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Apply filters to prazos
  const filteredPrazos = prazos.filter(p => {
    const statusMatch = filterStatus === "todos" || 
      (filterStatus === "pendente" && !p.concluido) || 
      (filterStatus === "concluido" && p.concluido);
    const prioridadeMatch = filterPrioridade === "todas" || p.prioridade === filterPrioridade;
    const tipoMatch = filterTipo === "todos" || p.tipo === filterTipo;
    return statusMatch && prioridadeMatch && tipoMatch;
  });

  const getPrazosByDay = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const targetDate = new Date(year, month, day);
    
    return filteredPrazos.filter(p => isSameDay(parseISO(p.data), targetDate));
  };

  const getPrazoStatusColor = (prazo: Prazo) => {
    if (prazo.concluido) return "bg-muted text-muted-foreground";
    const prazoDate = new Date(prazo.data);
    if (isPast(prazoDate) && !isToday(prazoDate)) return "bg-destructive text-destructive-foreground";
    if (isToday(prazoDate)) return "bg-warning text-warning-foreground";
    return "bg-primary text-primary-foreground";
  };

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
        <Card className="p-6 shadow-card">
          {/* Calendar Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold capitalize text-foreground">{monthName}</h2>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week days */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
                {day}
              </div>
            ))}
            
            {/* Empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-24 rounded-lg bg-muted/30"></div>
            ))}
            
            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayPrazos = getPrazosByDay(day);
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth();
              const dayDate = new Date(year, month, day);
              const todayCheck = new Date();
              const isTodayDay = day === todayCheck.getDate() && 
                            currentDate.getMonth() === todayCheck.getMonth() && 
                            currentDate.getFullYear() === todayCheck.getFullYear();
              
              const hasVencidos = dayPrazos.some((p) => !p.concluido && isPast(new Date(p.data)) && !isToday(new Date(p.data)));
              const isDragOver = dragOverDate && isSameDay(dragOverDate, dayDate);
              
              return (
                <div
                  key={day}
                  onDragOver={(e) => handleDragOver(e, dayDate)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dayDate)}
                  className={`min-h-24 rounded-lg border p-2 transition-all ${
                    isTodayDay ? 'border-primary border-2 bg-primary/5' : 'border-border'
                  } ${hasVencidos ? 'bg-destructive/10' : ''} ${
                    isDragOver ? 'border-primary border-2 bg-primary/20 scale-[1.02]' : ''
                  }`}
                >
                  <div className={`mb-1 text-sm font-semibold ${isTodayDay ? 'text-primary' : 'text-foreground'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayPrazos.slice(0, 3).map(prazo => (
                      <div
                        key={prazo.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, prazo)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          setSelectedPrazo(prazo);
                          setDetailsDialogOpen(true);
                        }}
                        className={`rounded px-1.5 py-0.5 text-xs font-medium cursor-grab active:cursor-grabbing transition-all hover:scale-105 flex items-center gap-1 ${getPrazoStatusColor(prazo)} ${
                          draggedPrazo?.id === prazo.id ? "opacity-50" : ""
                        }`}
                        title={`${prazo.titulo} - Arraste para alterar a data`}
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
          
          {/* Legend */}
          <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="text-muted-foreground font-medium">Legenda:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-muted"></div>
                <span className="text-muted-foreground">Concluído</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-primary"></div>
                <span className="text-muted-foreground">Pendente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-warning"></div>
                <span className="text-muted-foreground">Vence hoje</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-destructive"></div>
                <span className="text-muted-foreground">Vencido</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              <GripVertical className="h-4 w-4" />
              <span>Arraste os prazos para alterar as datas</span>
            </div>
          </div>
        </Card>

        {/* Upcoming Deadlines List */}
        <Card className="p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Lista de Prazos</h2>
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
            </div>
          </div>
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-muted-foreground">Carregando...</p>
            ) : filteredPrazos.length === 0 ? (
              <p className="text-center text-muted-foreground">
                {prazos.length === 0 ? "Nenhum prazo cadastrado" : "Nenhum prazo corresponde aos filtros selecionados"}
              </p>
            ) : (
              filteredPrazos.map(prazo => {
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
              })
            )}
          </div>
        </Card>
      </div>

      <PrazoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchPrazos}
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
    </MainLayout>
  );
}
