import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DollarSign, TrendingUp, AlertCircle, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { HonorarioForm } from "@/components/Financeiro/HonorarioForm";

interface Honorario {
  id: string;
  processo_id: string | null;
  valor_total: number;
  valor_pago: number;
  data_vencimento: string | null;
  status: string;
  observacoes: string | null;
  processos: {
    numero: string;
    clientes: {
      nome: string;
    } | null;
  } | null;
}

export default function Financeiro() {
  const { user } = useAuth();
  const [honorarios, setHonorarios] = useState<Honorario[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHonorario, setEditingHonorario] = useState<Honorario | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [honorarioToDelete, setHonorarioToDelete] = useState<Honorario | null>(null);

  useEffect(() => {
    fetchHonorarios();
  }, [user]);

  const fetchHonorarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('honorarios')
      .select(`
        *,
        processos (
          numero,
          clientes (nome)
        )
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar honorários:', error);
      toast.error('Erro ao carregar honorários');
    } else {
      setHonorarios(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!honorarioToDelete) return;

    const { error } = await supabase
      .from('honorarios')
      .delete()
      .eq('id', honorarioToDelete.id);

    if (error) {
      console.error('Erro ao deletar honorário:', error);
      toast.error('Erro ao deletar honorário');
    } else {
      toast.success('Honorário deletado com sucesso!');
      fetchHonorarios();
    }
    
    setDeleteDialogOpen(false);
    setHonorarioToDelete(null);
  };

  const calcularEstatisticas = () => {
    const totalReceber = honorarios.reduce((sum, h) => sum + (h.valor_total - h.valor_pago), 0);
    const totalRecebido = honorarios.reduce((sum, h) => sum + h.valor_pago, 0);
    const totalPendente = honorarios
      .filter(h => h.status === 'pendente')
      .reduce((sum, h) => sum + h.valor_total, 0);
    
    const totalGeral = honorarios.reduce((sum, h) => sum + h.valor_total, 0);
    const taxaAdimplencia = totalGeral > 0 ? (totalRecebido / totalGeral) * 100 : 0;

    return {
      totalReceber,
      totalRecebido,
      totalPendente,
      taxaAdimplencia
    };
  };

  const stats = calcularEstatisticas();

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">Controle de honorários e receitas</p>
          </div>
          <Button onClick={() => { setEditingHonorario(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Honorário
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total a Receber</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {stats.totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Recebido</p>
                <p className="text-2xl font-bold text-success">
                  R$ {stats.totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold text-warning">
                  R$ {stats.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa Adimplência</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.taxaAdimplencia.toFixed(0)}%
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Honorários */}
        <Card className="p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Honorários Cadastrados</h2>
          
          {honorarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum honorário cadastrado ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {honorarios.map(honorario => {
                const percentual = honorario.valor_total > 0 
                  ? (honorario.valor_pago / honorario.valor_total) * 100 
                  : 0;
                
                return (
                  <div
                    key={honorario.id}
                    className="rounded-lg border border-border bg-gradient-card p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {honorario.processos?.clientes?.nome || 'Cliente não vinculado'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {honorario.processos?.numero 
                            ? `Processo: ${honorario.processos.numero}` 
                            : 'Sem processo vinculado'}
                        </p>
                        {honorario.data_vencimento && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Vencimento: {new Date(honorario.data_vencimento).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          honorario.status === 'pago' ? 'default' :
                          honorario.status === 'parcial' ? 'secondary' : 'destructive'
                        }>
                          {honorario.status === 'pago' ? 'Quitado' :
                           honorario.status === 'parcial' ? 'Parcial' : 'Pendente'}
                        </Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingHonorario(honorario);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setHonorarioToDelete(honorario);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          R$ {honorario.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / 
                          R$ {honorario.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="font-medium text-foreground">{percentual.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full transition-all ${
                            honorario.status === 'pago' ? 'bg-success' :
                            honorario.status === 'parcial' ? 'bg-warning' : 'bg-destructive'
                          }`}
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                      {honorario.observacoes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {honorario.observacoes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <HonorarioForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchHonorarios}
        editingHonorario={editingHonorario}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este honorário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
