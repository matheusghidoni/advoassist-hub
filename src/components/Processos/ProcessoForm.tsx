import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const processoSchema = z.object({
  numero: z.string().min(1, "Número do processo é obrigatório"),
  tipo: z.string().min(1, "Tipo é obrigatório"),
  status: z.string(),
  cliente_id: z.string().optional(),
  valor: z.string().optional(),
  vara: z.string().optional(),
  comarca: z.string().optional(),
});

type ProcessoFormData = z.infer<typeof processoSchema>;

interface ProcessoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  processo?: any;
}

export function ProcessoForm({ open, onOpenChange, onSuccess, processo }: ProcessoFormProps) {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ProcessoFormData>({
    resolver: zodResolver(processoSchema),
    defaultValues: processo || { status: "em_andamento" },
  });

  const status = watch("status");
  const cliente_id = watch("cliente_id");

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    const { data } = await supabase.from("clientes").select("*").order("nome");
    if (data) setClientes(data);
  };

  const onSubmit = async (data: ProcessoFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const payload = {
        numero: data.numero,
        tipo: data.tipo,
        status: data.status,
        valor: data.valor ? parseFloat(data.valor) : null,
        vara: data.vara || null,
        comarca: data.comarca || null,
        cliente_id: data.cliente_id || null,
      };

      if (processo) {
        const { error } = await supabase
          .from("processos")
          .update(payload)
          .eq("id", processo.id);
        
        if (error) throw error;
        toast.success("Processo atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("processos")
          .insert([{ ...payload, user_id: user.id }]);
        
        if (error) throw error;
        toast.success("Processo cadastrado com sucesso!");
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{processo ? "Editar Processo" : "Novo Processo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número do Processo</Label>
              <Input id="numero" {...register("numero")} />
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
              <Label htmlFor="valor">Valor da Causa (R$)</Label>
              <Input id="valor" type="number" step="0.01" {...register("valor")} />
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

          <div className="flex gap-2 justify-end">
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
