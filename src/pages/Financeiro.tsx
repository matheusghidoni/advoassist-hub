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
import { DollarSign, TrendingUp, AlertCircle, Plus, MoreVertical, Pencil, Trash2, Scale, FileText, PieChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { HonorarioForm } from "@/components/Financeiro/HonorarioForm";

interface Honorario {
  id: string;
  processo_id: string | null;
  valor_total: number;
  valor_entrada: number;
  valor_pago: number;
  data_vencimento: string | null;
  status: string;
  observacoes: string | null;
  tipo_pagamento: string;
  numero_parcelas: number | null;
  processos: {
    numero: string;
    clientes: {
      nome: string;
    } | null;
  } | null;
}

interface Processo {
  id: string;
  numero: string;
  tipo: string;
  status: string;
  valor: number | null;
  clientes: {
    nome: string;
  } | null;
}

export default function Financeiro() {
  const { user } = useAuth();
  const [honorarios, setHonorarios] = useState<Honorario[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHonorario, setEditingHonorario] = useState<Honorario | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [honorarioToDelete, setHonorarioToDelete] = useState<Honorario | null>(null);

  useEffect(() => {
    fetchHonorarios();
    fetchProcessos();
  }, [user]);

  const fetchHonorarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('honorarios')
      .select(`
        *,
        processos!honorarios_processo_id_fkey (
          numero,
          clientes!processos_cliente_id_fkey (nome)
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

  const fetchProcessos = async () => {
    const { data, error } = await supabase
      .from('processos')
      .select(`
        id,
        numero,
        tipo,
        status,
        valor,
        clientes!processos_cliente_id_fkey (nome)
      `)
      .eq('user_id', user?.id);

    if (error) {
      console.error('Erro ao buscar processos:', error);
    } else {
      setProcessos(data || []);
    }
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

  const calcularEstatisticasProcessos = () => {
    const totalValorCausas = processos.reduce((sum, p) => sum + (p.valor || 0), 0);
    const processosComValor = processos.filter(p => p.valor && p.valor > 0);
    const mediaValorCausa = processosComValor.length > 0 
      ? totalValorCausas / processosComValor.length 
      : 0;
    
    const valorPorStatus = processos.reduce((acc, p) => {
      const status = p.status || 'outros';
      acc[status] = (acc[status] || 0) + (p.valor || 0);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalValorCausas,
      mediaValorCausa,
      processosComValor: processosComValor.length,
      totalProcessos: processos.length,
      valorPorStatus
    };
  };

  const stats = calcularEstatisticas();
  const statsProcessos = calcularEstatisticasProcessos();

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

        {/* Relatório de Valores das Causas */}
        <Card className="p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Relatório de Valores das Causas</h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Valor Total das Causas</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                R$ {statsProcessos.totalValorCausas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {statsProcessos.processosComValor} de {statsProcessos.totalProcessos} processos com valor
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Média por Processo</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                R$ {statsProcessos.mediaValorCausa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Processos Cadastrados</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {statsProcessos.totalProcessos}
              </p>
            </div>
          </div>

          {/* Valores por Status */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Valores por Status</h3>
            <div className="grid gap-2 md:grid-cols-4">
              {Object.entries(statsProcessos.valorPorStatus).map(([status, valor]) => {
                const statusLabels: Record<string, string> = {
                  em_andamento: 'Em Andamento',
                  suspenso: 'Suspenso',
                  concluido: 'Concluído',
                  arquivado: 'Arquivado'
                };
                const statusColors: Record<string, string> = {
                  em_andamento: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                  suspenso: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
                  concluido: 'bg-green-500/10 text-green-600 border-green-500/20',
                  arquivado: 'bg-gray-500/10 text-gray-600 border-gray-500/20'
                };
                return (
                  <div 
                    key={status} 
                    className={`p-3 rounded-lg border ${statusColors[status] || 'bg-muted border-border'}`}
                  >
                    <p className="text-xs font-medium mb-1">{statusLabels[status] || status}</p>
                    <p className="text-lg font-bold">
                      R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

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
                      
                      {honorario.tipo_pagamento === 'parcelado' && honorario.numero_parcelas && (
                        <div className="p-2 bg-muted/50 rounded-md mt-2">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Parcelado em {honorario.numero_parcelas}x</span>
                            {' - '}Valor por parcela: R$ {(
                              (honorario.valor_total - (honorario.valor_entrada || 0)) / honorario.numero_parcelas
                            ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {honorario.valor_entrada > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Entrada: R$ {honorario.valor_entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      )}
                      
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
