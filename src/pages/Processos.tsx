import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, Calendar, User, Pencil, Trash2 } from "lucide-react";
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

export default function Processos() {
  const [processos, setProcessos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProcesso, setEditingProcesso] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [processoToDelete, setProcessoToDelete] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProcessos();
  }, []);

  const fetchProcessos = async () => {
    try {
      const { data, error } = await supabase
        .from("processos")
        .select("*, clientes!processos_cliente_id_fkey(nome)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setProcessos(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar processos");
    } finally {
      setLoading(false);
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

  const filteredProcessos = processos.filter(processo =>
    processo.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    processo.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Button variant="outline">Filtros</Button>
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
          ) : filteredProcessos.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground">
                {searchTerm ? "Nenhum processo encontrado" : "Nenhum processo cadastrado"}
              </p>
            </Card>
          ) : (
            filteredProcessos.map((processo) => {
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
                            R$ {processo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span></span>
                        </div>
                      )}
                    </div>
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
