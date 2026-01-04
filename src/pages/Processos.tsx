import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, Calendar, User, Pencil, Trash2, Clock, AlertCircle, CheckCircle2, Circle, ArrowUpDown } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProcessoForm } from "@/components/Processos/ProcessoForm";
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

type PrazoFilter = "todos" | "vencidos" | "proximos" | "em_dia";
type SortOrder = "recente" | "proximo_prazo";

export default function Processos() {
  const [processos, setProcessos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProcesso, setEditingProcesso] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [processoToDelete, setProcessoToDelete] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [prazoFilter, setPrazoFilter] = useState<PrazoFilter>("todos");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recente");

  useEffect(() => {
    fetchProcessos();
  }, []);

  const fetchProcessos = async () => {
    try {
      const { data, error } = await supabase
        .from("processos")
        .select("*, clientes!processos_cliente_id_fkey(nome), prazos!fk_prazos_processo(*)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setProcessos(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar processos");
    } finally {
      setLoading(false);
    }
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
      alta: "bg-destructive/10 text-destructive border-destructive/30",
      media: "bg-warning/10 text-warning border-warning/30",
      baixa: "bg-muted text-muted-foreground border-muted-foreground/30",
    };
    return colors[prioridade] || colors.media;
  };

  const togglePrazoConcluido = async (prazoId: string, concluido: boolean) => {
    try {
      const { error } = await supabase
        .from("prazos")
        .update({ concluido: !concluido })
        .eq("id", prazoId);
      
      if (error) throw error;
      toast.success(concluido ? "Prazo reaberto" : "Prazo marcado como concluído");
      fetchProcessos();
    } catch (error: any) {
      toast.error("Erro ao atualizar prazo");
    }
  };

  const handleDelete = async () => {
    if (!processoToDelete) return;
    
    try {
      const { error } = await supabase
        .from("processos")
        .delete()
        .eq("id", processoToDelete.id);
      
      if (error) throw error;
      toast.success("Processo excluído com sucesso!");
      fetchProcessos();
    } catch (error: any) {
      toast.error("Erro ao excluir processo");
    } finally {
      setDeleteDialogOpen(false);
      setProcessoToDelete(null);
    }
  };

  const hasVencidos = (prazos: any[]) => {
    if (!prazos || prazos.length === 0) return false;
    return prazos.some(p => !p.concluido && isPast(new Date(p.data)) && !isToday(new Date(p.data)));
  };

  const hasProximos = (prazos: any[]) => {
    if (!prazos || prazos.length === 0) return false;
    const hoje = new Date();
    const seteDias = new Date();
    seteDias.setDate(hoje.getDate() + 7);
    return prazos.some(p => {
      if (p.concluido) return false;
      const prazoDate = new Date(p.data);
      return (isToday(prazoDate) || isTomorrow(prazoDate) || (prazoDate > hoje && prazoDate <= seteDias));
    });
  };

  const getProximoPrazo = (prazos: any[]): Date | null => {
    if (!prazos || prazos.length === 0) return null;
    const prazosNaoConcluidos = prazos.filter(p => !p.concluido);
    if (prazosNaoConcluidos.length === 0) return null;
    const sorted = prazosNaoConcluidos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    return new Date(sorted[0].data);
  };

  const filteredProcessos = processos.filter(processo => {
    const matchesSearch = processo.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      processo.tipo.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (prazoFilter === "vencidos") {
      return hasVencidos(processo.prazos);
    }
    if (prazoFilter === "proximos") {
      return hasProximos(processo.prazos);
    }
    if (prazoFilter === "em_dia") {
      return !hasVencidos(processo.prazos) && !hasProximos(processo.prazos);
    }
    return true;
  });

  const sortedProcessos = [...filteredProcessos].sort((a, b) => {
    if (sortOrder === "proximo_prazo") {
      const prazoA = getProximoPrazo(a.prazos);
      const prazoB = getProximoPrazo(b.prazos);
      
      // Processos sem prazo vão para o final
      if (!prazoA && !prazoB) return 0;
      if (!prazoA) return 1;
      if (!prazoB) return -1;
      
      return prazoA.getTime() - prazoB.getTime();
    }
    // Ordenação padrão: mais recente primeiro
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Contadores para os filtros
  const vencidosCount = processos.filter(p => hasVencidos(p.prazos)).length;
  const proximosCount = processos.filter(p => hasProximos(p.prazos)).length;

  // Calcular estatísticas reais
  const emAndamento = processos.filter(p => p.status === 'em_andamento').length;
  const suspensos = processos.filter(p => p.status === 'suspenso').length;
  const concluidos = processos.filter(p => p.status === 'concluido').length;
  const arquivados = processos.filter(p => p.status === 'arquivado').length;

  const getStatusVariant = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      em_andamento: { label: "Em andamento", className: "bg-status-active text-success-foreground" },
      suspenso: { label: "Suspenso", className: "bg-status-pending text-warning-foreground" },
      concluido: { label: "Concluído", className: "bg-status-completed text-primary-foreground" },
      arquivado: { label: "Arquivado", className: "bg-status-archived text-muted-foreground" },
    };
    return variants[status] || variants.em_andamento;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Processos</h1>
            <p className="text-muted-foreground">Acompanhe todos os seus processos</p>
          </div>
          <Button className="gap-2" onClick={() => {
            setEditingProcesso(null);
            setFormOpen(true);
          }}>
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground mr-2">Filtrar por prazos:</span>
                <Button 
                  variant={prazoFilter === "todos" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setPrazoFilter("todos")}
                >
                  Todos
                </Button>
                <Button 
                  variant={prazoFilter === "vencidos" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setPrazoFilter("vencidos")}
                  className={prazoFilter !== "vencidos" ? "border-destructive/50 text-destructive hover:bg-destructive/10" : ""}
                >
                  <AlertCircle className="mr-1 h-4 w-4" />
                  Vencidos ({vencidosCount})
                </Button>
                <Button 
                  variant={prazoFilter === "proximos" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setPrazoFilter("proximos")}
                  className={prazoFilter !== "proximos" ? "border-warning/50 text-warning hover:bg-warning/10" : ""}
                >
                  <Clock className="mr-1 h-4 w-4" />
                  Próximos 7 dias ({proximosCount})
                </Button>
                <Button 
                  variant={prazoFilter === "em_dia" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setPrazoFilter("em_dia")}
                >
                  Em dia
                </Button>
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
          <Card className="p-4 shadow-card">
            <div className="text-center">
              <p className="text-2xl font-bold text-status-active">{emAndamento}</p>
              <p className="text-sm text-muted-foreground">Em andamento</p>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="text-center">
              <p className="text-2xl font-bold text-status-pending">{suspensos}</p>
              <p className="text-sm text-muted-foreground">Suspensos</p>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="text-center">
              <p className="text-2xl font-bold text-status-completed">{concluidos}</p>
              <p className="text-sm text-muted-foreground">Concluídos</p>
            </div>
          </Card>
          <Card className="p-4 shadow-card">
            <div className="text-center">
              <p className="text-2xl font-bold text-status-archived">{arquivados}</p>
              <p className="text-sm text-muted-foreground">Arquivados</p>
            </div>
          </Card>
        </div>

        {/* Process List */}
        <div className="grid gap-4">
          {loading ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">Carregando...</p>
            </Card>
          ) : sortedProcessos.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">
                {searchTerm ? "Nenhum processo encontrado" : "Nenhum processo cadastrado"}
              </p>
            </Card>
          ) : (
            sortedProcessos.map((processo) => {
              const statusInfo = getStatusVariant(processo.status);
              return (
                <Card key={processo.id} className="p-6 shadow-card hover:shadow-md transition-shadow">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{processo.numero}</h3>
                          <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                          <Badge variant="outline">{processo.tipo}</Badge>
                        </div>
                        {processo.comarca && <p className="text-sm text-muted-foreground">Comarca: {processo.comarca}</p>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingProcesso(processo);
                            setFormOpen(true);
                          }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
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

                    {/* Details */}
                    <div className="grid gap-4 md:grid-cols-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Cliente: <span className="font-medium text-foreground">
                          {processo.clientes?.nome || "Não vinculado"}
                        </span></span>
                      </div>
                      {processo.vara && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>Vara: <span className="font-medium text-foreground">{processo.vara}</span></span>
                        </div>
                      )}
                      {processo.valor && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>Valor: <span className="font-medium text-foreground">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(processo.valor)}
                          </span></span>
                        </div>
                      )}
                    </div>

                    {/* Prazos Vinculados */}
                    {processo.prazos && processo.prazos.length > 0 && (
                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">
                            Prazos ({processo.prazos.length})
                          </span>
                        </div>
                        <div className="grid gap-2">
                          {processo.prazos
                            .sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime())
                            .slice(0, 3)
                            .map((prazo: any) => (
                              <div 
                                key={prazo.id} 
                                className="flex items-center justify-between p-2 rounded-md bg-muted/50 group"
                              >
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => togglePrazoConcluido(prazo.id, prazo.concluido)}
                                    className="flex-shrink-0 hover:scale-110 transition-transform"
                                    title={prazo.concluido ? "Marcar como pendente" : "Marcar como concluído"}
                                  >
                                    {prazo.concluido ? (
                                      <CheckCircle2 className="h-5 w-5 text-primary" />
                                    ) : (
                                      <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                                    )}
                                  </button>
                                  {isPast(new Date(prazo.data)) && !prazo.concluido && !isToday(new Date(prazo.data)) && (
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                  )}
                                  <div>
                                    <p className={`text-sm font-medium ${getPrazoStatusColor(prazo.data, prazo.concluido)}`}>
                                      {prazo.titulo}
                                    </p>
                                    <p className={`text-xs ${getPrazoStatusColor(prazo.data, prazo.concluido)}`}>
                                      {format(new Date(prazo.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-xs ${getPrazoPrioridadeColor(prazo.prioridade)}`}>
                                    {prazo.prioridade === 'alta' ? 'Alta' : prazo.prioridade === 'media' ? 'Média' : 'Baixa'}
                                  </Badge>
                                  {prazo.concluido && (
                                    <Badge variant="secondary" className="text-xs">Concluído</Badge>
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
      </div>

      <ProcessoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchProcessos}
        processo={editingProcesso}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o processo {processoToDelete?.numero}? Esta ação não pode ser desfeita.
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
