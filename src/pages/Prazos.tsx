import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Pencil, Trash2, MoreVertical, FileText, AlertCircle, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PrazoForm } from "@/components/Prazos/PrazoForm";
import { format, parseISO } from "date-fns";
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

export default function Prazos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [prazos, setPrazos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrazo, setEditingPrazo] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prazoToDelete, setPrazoToDelete] = useState<any>(null);
  const [selectedPrazo, setSelectedPrazo] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
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
    
    return filteredPrazos.filter(p => {
      const prazoDate = parseISO(p.data);
      return prazoDate.getDate() === day && 
             prazoDate.getMonth() === month && 
             prazoDate.getFullYear() === year;
    });
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

  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);
  
  const prazosCriticos = prazos.filter(p => {
    const prazoDate = parseISO(p.data);
    prazoDate.setHours(0, 0, 0, 0);
    return prazoDate >= today && prazoDate <= threeDaysFromNow && !p.concluido;
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
        <div className="grid gap-4 md:grid-cols-3">
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
                <p className="text-sm text-muted-foreground">Críticos (&lt; 3 dias)</p>
                <p className="text-2xl font-bold text-destructive">{prazosCriticos}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Clock className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </Card>
        </div>

        {/* Calendar */}
        <Card className="p-6 shadow-card">
          {/* Calendar Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold capitalize text-foreground">{monthName}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
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
              const todayCheck = new Date();
              const isToday = day === todayCheck.getDate() && 
                            currentDate.getMonth() === todayCheck.getMonth() && 
                            currentDate.getFullYear() === todayCheck.getFullYear();
              
              return (
                <div
                  key={day}
                  className={`min-h-24 rounded-lg border p-2 transition-colors hover:border-primary ${
                    isToday ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className={`mb-1 text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayPrazos.map(prazo => {
                      const prazoDate = parseISO(prazo.data);
                      prazoDate.setHours(0, 0, 0, 0);
                      const todayDate = new Date();
                      todayDate.setHours(0, 0, 0, 0);
                      const diffDays = Math.ceil((prazoDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
                      
                      // Determine color based on status
                      let colorClass = '';
                      if (prazo.concluido) {
                        // Completed - Green
                        colorClass = 'bg-success/20 text-success hover:bg-success/30 border-l-2 border-l-success';
                      } else if (diffDays < 0) {
                        // Overdue - Dark red
                        colorClass = 'bg-destructive/30 text-destructive hover:bg-destructive/40 border-l-2 border-l-destructive';
                      } else if (diffDays <= 3) {
                        // Critical (within 3 days) - Red
                        colorClass = 'bg-destructive/20 text-destructive hover:bg-destructive/30 border-l-2 border-l-destructive';
                      } else if (diffDays <= 7) {
                        // Near deadline (within 7 days) - Orange/Warning
                        colorClass = 'bg-warning/20 text-warning hover:bg-warning/30 border-l-2 border-l-warning';
                      } else {
                        // Normal pending - Blue/Primary
                        colorClass = 'bg-primary/20 text-primary hover:bg-primary/30 border-l-2 border-l-primary';
                      }
                      
                      return (
                        <div
                          key={prazo.id}
                          onClick={() => {
                            setSelectedPrazo(prazo);
                            setDetailsDialogOpen(true);
                          }}
                          className={`rounded px-1.5 py-0.5 text-xs font-medium cursor-pointer transition-all hover:scale-105 ${colorClass}`}
                        >
                          {prazo.titulo}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <span className="text-muted-foreground font-medium">Legenda:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-success/30 border-l-2 border-l-success"></div>
              <span className="text-muted-foreground">Concluído</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary/30 border-l-2 border-l-primary"></div>
              <span className="text-muted-foreground">Pendente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-warning/30 border-l-2 border-l-warning"></div>
              <span className="text-muted-foreground">Próximo (≤7 dias)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-destructive/30 border-l-2 border-l-destructive"></div>
              <span className="text-muted-foreground">Crítico (≤3 dias) / Atrasado</span>
            </div>
          </div>
        </Card>

        {/* Upcoming Deadlines List */}
        <Card className="p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Próximos Prazos</h2>
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
                      <Badge variant="outline">
                        {prazo.tipo}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
