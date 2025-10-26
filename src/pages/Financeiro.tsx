import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DollarSign, TrendingUp, AlertCircle, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { HonorarioForm } from "@/components/Financeiro/HonorarioForm";

export default function Financeiro() {
  const { user } = useAuth();
  const [honorarios, setHonorarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingHonorario, setEditingHonorario] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [honorarioToDelete, setHonorarioToDelete] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchHonorarios();
    }
  }, [user]);

  const fetchHonorarios = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("honorarios")
      .select(`
        *,
        processos (
          numero,
          clientes (
            nome
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar honorários:", error);
      toast.error("Erro ao carregar honorários");
    } else {
      setHonorarios(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!honorarioToDelete) return;

    const { error } = await supabase
      .from("honorarios")
      .delete()
      .eq("id", honorarioToDelete.id)
      .eq("user_id", user?.id);

    if (error) {
      toast.error("Erro ao excluir honorário");
      console.error(error);
    } else {
      toast.success("Honorário excluído com sucesso!");
      fetchHonorarios();
    }

    setDeleteDialogOpen(false);
    setHonorarioToDelete(null);
  };

  const totalAReceber = honorarios.reduce((acc, h) => acc + (parseFloat(h.valor_total) - parseFloat(h.valor_pago)), 0);
  const totalRecebido = honorarios.reduce((acc, h) => acc + parseFloat(h.valor_pago), 0);
  const totalPendente = honorarios.filter(h => h.status === 'pendente').reduce((acc, h) => acc + parseFloat(h.valor_total), 0);
  const taxaAdimplencia = honorarios.length > 0 
    ? ((honorarios.filter(h => h.status === 'pago').length / honorarios.length) * 100).toFixed(0)
    : 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">Controle de honorários e receitas</p>
          </div>
          <Button onClick={() => {
            setEditingHonorario(null);
            setFormOpen(true);
          }}>
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
                  R$ {totalAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                  R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                  R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                <p className="text-2xl font-bold text-foreground">{taxaAdimplencia}%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Recebimentos */}
        <Card className="p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Honorários por Processo</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : honorarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum honorário cadastrado ainda.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setFormOpen(true)}
              >
                Cadastrar primeiro honorário
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {honorarios.map(hon => {
                const valorTotal = parseFloat(hon.valor_total);
                const valorPago = parseFloat(hon.valor_pago);
                const percentual = (valorPago / valorTotal) * 100;
                const clienteNome = hon.processos?.clientes?.nome || "Cliente não vinculado";
                const processoNumero = hon.processos?.numero || "Sem processo";

                return (
                  <div
                    key={hon.id}
                    className="rounded-lg border border-border bg-gradient-card p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{clienteNome}</h3>
                        <p className="text-sm text-muted-foreground">Processo: {processoNumero}</p>
                        {hon.data_vencimento && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Vencimento: {new Date(hon.data_vencimento).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          hon.status === 'pago' ? 'default' :
                          hon.status === 'parcial' ? 'secondary' : 'destructive'
                        }>
                          {hon.status === 'pago' ? 'Quitado' :
                           hon.status === 'parcial' ? 'Parcial' : 'Pendente'}
                        </Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingHonorario(hon);
                              setFormOpen(true);
                            }}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setHonorarioToDelete(hon);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
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
                          R$ {valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="font-medium text-foreground">{percentual.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full transition-all ${
                            hon.status === 'pago' ? 'bg-success' :
                            hon.status === 'parcial' ? 'bg-warning' : 'bg-destructive'
                          }`}
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                      {hon.observacoes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {hon.observacoes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

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
      </div>
    </MainLayout>
  );
}
