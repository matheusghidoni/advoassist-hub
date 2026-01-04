import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Calendar, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { startOfDay, isBefore, parseISO } from "date-fns";

const processoSchema = z.object({
  numero: z.string().trim().min(1, "Número do processo é obrigatório"),
  tipo: z.string().trim().min(1, "Tipo é obrigatório").max(100, "Tipo deve ter no máximo 100 caracteres"),
  status: z.string(),
  cliente_id: z.string().optional(),
  valor: z.string().optional(),
  vara: z.string().trim().max(100, "Vara deve ter no máximo 100 caracteres").optional(),
  comarca: z.string().trim().max(100, "Comarca deve ter no máximo 100 caracteres").optional(),
});

const formatCurrency = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return "";
  const cents = parseInt(numbers, 10);
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrency = (value: string): number => {
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return 0;
  return parseInt(numbers, 10) / 100;
};

const formatProcessoNumero = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 7) return numbers;
  if (numbers.length <= 9) return `${numbers.slice(0, 7)}-${numbers.slice(7)}`;
  if (numbers.length <= 13) return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9)}`;
  if (numbers.length <= 14) return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9, 13)}.${numbers.slice(13)}`;
  if (numbers.length <= 16) return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9, 13)}.${numbers.slice(13, 14)}.${numbers.slice(14)}`;
  return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9, 13)}.${numbers.slice(13, 14)}.${numbers.slice(14, 16)}.${numbers.slice(16, 20)}`;
};

type ProcessoFormData = z.infer<typeof processoSchema>;

interface PrazoItem {
  id: string;
  titulo: string;
  data: string;
  tipo: string;
  prioridade: string;
  descricao: string;
}

interface ProcessoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  processo?: any;
}

const createEmptyPrazo = (): PrazoItem => ({
  id: crypto.randomUUID(),
  titulo: "",
  data: "",
  tipo: "",
  prioridade: "media",
  descricao: "",
});

const isPastDate = (dateString: string): boolean => {
  if (!dateString) return false;
  const date = parseISO(dateString);
  const today = startOfDay(new Date());
  return isBefore(date, today);
};

export function ProcessoForm({ open, onOpenChange, onSuccess, processo }: ProcessoFormProps) {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [prazos, setPrazos] = useState<PrazoItem[]>([]);
  
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<ProcessoFormData>({
    resolver: zodResolver(processoSchema),
    defaultValues: { status: "em_andamento" },
  });

  const status = watch("status");
  const cliente_id = watch("cliente_id");
  const valorField = watch("valor");

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (processo) {
      const valorFormatado = processo.valor ? formatCurrency((processo.valor * 100).toFixed(0)) : "";
      reset({
        numero: processo.numero,
        tipo: processo.tipo,
        status: processo.status,
        cliente_id: processo.cliente_id,
        valor: valorFormatado,
        vara: processo.vara || "",
        comarca: processo.comarca || "",
      });
      setPrazos([]);
    } else {
      reset({ status: "em_andamento" });
      setPrazos([]);
    }
  }, [processo, reset]);

  const fetchClientes = async () => {
    const { data } = await supabase.from("clientes").select("*").order("nome");
    if (data) setClientes(data);
  };

  const addPrazo = () => {
    setPrazos([...prazos, createEmptyPrazo()]);
  };

  const removePrazo = (id: string) => {
    setPrazos(prazos.filter(p => p.id !== id));
  };

  const updatePrazo = (id: string, field: keyof PrazoItem, value: string) => {
    setPrazos(prazos.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const onSubmit = async (data: ProcessoFormData) => {
    // Validar se há prazos com datas passadas
    const prazosComDataPassada = prazos.filter(p => p.data && isPastDate(p.data));
    if (prazosComDataPassada.length > 0) {
      toast.error("Não é possível cadastrar prazos com datas passadas. Corrija as datas antes de salvar.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const payload = {
        numero: data.numero,
        tipo: data.tipo,
        status: data.status,
        valor: data.valor ? parseCurrency(data.valor) : null,
        vara: data.vara || null,
        comarca: data.comarca || null,
        cliente_id: data.cliente_id || null,
      };

      let processoId = processo?.id;

      if (processo) {
        const { error } = await supabase
          .from("processos")
          .update(payload)
          .eq("id", processo.id);
        
        if (error) throw error;
        toast.success("Processo atualizado com sucesso!");
      } else {
        const { data: newProcesso, error } = await supabase
          .from("processos")
          .insert([{ ...payload, user_id: user.id }])
          .select()
          .single();
        
        if (error) throw error;
        processoId = newProcesso.id;
        toast.success("Processo cadastrado com sucesso!");
      }

      // Criar prazos válidos
      const prazosValidos = prazos.filter(p => p.titulo && p.data && p.tipo);
      
      if (prazosValidos.length > 0 && processoId) {
        const prazosPayload = prazosValidos.map(prazo => ({
          user_id: user.id,
          processo_id: processoId,
          data: prazo.data,
          titulo: prazo.titulo.trim(),
          tipo: prazo.tipo,
          prioridade: prazo.prioridade || "media",
          descricao: prazo.descricao?.trim() || null,
          concluido: false,
        }));

        const { error: prazoError } = await supabase
          .from("prazos")
          .insert(prazosPayload);

        if (prazoError) {
          console.error("Erro ao criar prazos:", prazoError);
          toast.warning(`Processo salvo, mas houve erro ao criar ${prazosValidos.length} prazo(s)`);
        } else {
          toast.success(`${prazosValidos.length} prazo(s) vinculado(s) criado(s) com sucesso!`);
        }
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar processo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{processo ? "Editar Processo" : "Novo Processo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número do Processo</Label>
              <Input 
                id="numero" 
                placeholder="0000000-00.0000.0.00.0000"
                {...register("numero")}
                onChange={(e) => {
                  const formatted = formatProcessoNumero(e.target.value);
                  e.target.value = formatted;
                  setValue("numero", formatted);
                }}
                maxLength={25}
              />
              {errors.numero && <p className="text-sm text-destructive">{errors.numero.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Input id="tipo" placeholder="Ex: Trabalhista, Cível..." {...register("tipo")} />
              {errors.tipo && <p className="text-sm text-destructive">{errors.tipo.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setValue("status", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente</Label>
              <Select value={cliente_id} onValueChange={(value) => setValue("cliente_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor da Causa</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input 
                  id="valor" 
                  className="pl-9"
                  placeholder="0,00"
                  value={valorField || ""}
                  onChange={(e) => {
                    const formatted = formatCurrency(e.target.value);
                    setValue("valor", formatted);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vara">Vara</Label>
              <Input id="vara" {...register("vara")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comarca">Comarca</Label>
            <Input id="comarca" {...register("comarca")} />
          </div>

          {/* Seção de Prazos Múltiplos */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">
                  Prazos ({prazos.length})
                </h3>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addPrazo}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Prazo
              </Button>
            </div>
            
            {prazos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-md">
                Nenhum prazo adicionado. Clique em "Adicionar Prazo" para vincular prazos a este processo.
              </p>
            ) : (
              <div className="space-y-3">
                {prazos.map((prazo, index) => (
                  <Card key={prazo.id} className="p-4 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removePrazo(prazo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <div className="pr-10">
                      <p className="text-xs font-medium text-muted-foreground mb-3">Prazo {index + 1}</p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Título *</Label>
                          <Input
                            placeholder="Ex: Audiência inicial"
                            value={prazo.titulo}
                            onChange={(e) => updatePrazo(prazo.id, "titulo", e.target.value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Data *</Label>
                          <Input
                            type="date"
                            value={prazo.data}
                            onChange={(e) => updatePrazo(prazo.id, "data", e.target.value)}
                            className={isPastDate(prazo.data) ? "border-destructive focus-visible:ring-destructive" : ""}
                          />
                          {isPastDate(prazo.data) && (
                            <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                              <AlertCircle className="h-3 w-3" />
                              Data não pode ser no passado
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo *</Label>
                          <Select 
                            value={prazo.tipo} 
                            onValueChange={(value) => updatePrazo(prazo.id, "tipo", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="audiencia">Audiência</SelectItem>
                              <SelectItem value="contestacao">Contestação</SelectItem>
                              <SelectItem value="recurso">Recurso</SelectItem>
                              <SelectItem value="peticao">Petição</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Prioridade</Label>
                          <Select 
                            value={prazo.prioridade} 
                            onValueChange={(value) => updatePrazo(prazo.id, "prioridade", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="alta">Alta</SelectItem>
                              <SelectItem value="media">Média</SelectItem>
                              <SelectItem value="baixa">Baixa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1 mt-3">
                        <Label className="text-xs">Descrição</Label>
                        <Textarea
                          placeholder="Detalhes adicionais..."
                          value={prazo.descricao}
                          onChange={(e) => updatePrazo(prazo.id, "descricao", e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {processo ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
