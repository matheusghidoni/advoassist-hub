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
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const prazoSchema = z.object({
  titulo: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  descricao: z.string().optional(),
  data: z.string().min(1, "Data é obrigatória"),
  tipo: z.string().min(1, "Tipo é obrigatório"),
  prioridade: z.string(),
  processo_id: z.string().optional(),
});

type PrazoFormData = z.infer<typeof prazoSchema>;

interface PrazoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prazo?: any;
}

export function PrazoForm({ open, onOpenChange, onSuccess, prazo }: PrazoFormProps) {
  const [loading, setLoading] = useState(false);
  const [processos, setProcessos] = useState<any[]>([]);
  
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<PrazoFormData>({
    resolver: zodResolver(prazoSchema),
    defaultValues: prazo ? {
      ...prazo,
      data: prazo.data ? format(new Date(prazo.data), "yyyy-MM-dd") : "",
    } : { prioridade: "media", tipo: "", processo_id: undefined },
  });

  const prioridade = watch("prioridade");
  const tipo = watch("tipo");
  const processo_id = watch("processo_id");

  useEffect(() => {
    fetchProcessos();
  }, []);

  useEffect(() => {
    if (prazo) {
      reset({
        titulo: prazo.titulo,
        descricao: prazo.descricao || "",
        data: prazo.data ? format(new Date(prazo.data), "yyyy-MM-dd") : "",
        tipo: prazo.tipo,
        prioridade: prazo.prioridade,
        processo_id: prazo.processo_id || undefined,
      });
    } else {
      reset({ prioridade: "media", tipo: "", processo_id: undefined, titulo: "", descricao: "", data: "" });
    }
  }, [prazo, reset]);

  const fetchProcessos = async () => {
    const { data } = await supabase.from("processos").select("*").order("numero");
    if (data) setProcessos(data);
  };

  const onSubmit = async (data: PrazoFormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const payload = {
        titulo: data.titulo,
        descricao: data.descricao || null,
        data: data.data,
        tipo: data.tipo,
        prioridade: data.prioridade,
        processo_id: data.processo_id || null,
      };

      if (prazo) {
        const { error } = await supabase
          .from("prazos")
          .update(payload)
          .eq("id", prazo.id);
        
        if (error) throw error;
        toast.success("Prazo atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("prazos")
          .insert([{ ...payload, user_id: user.id }]);
        
        if (error) throw error;
        toast.success("Prazo cadastrado com sucesso!");
      }

      reset({ prioridade: "media", tipo: "", processo_id: undefined });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar prazo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{prazo ? "Editar Prazo" : "Novo Prazo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" {...register("titulo")} />
            {errors.titulo && <p className="text-sm text-destructive">{errors.titulo.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" {...register("descricao")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" {...register("data")} />
              {errors.data && <p className="text-sm text-destructive">{errors.data.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(value) => setValue("tipo", value)}>
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
              {errors.tipo && <p className="text-sm text-destructive">{errors.tipo.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select value={prioridade} onValueChange={(value) => setValue("prioridade", value)}>
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

            <div className="space-y-2">
              <Label htmlFor="processo_id">Processo (Opcional)</Label>
              <Select value={processo_id || undefined} onValueChange={(value) => setValue("processo_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum processo vinculado" />
                </SelectTrigger>
                <SelectContent>
                  {processos.map((processo) => (
                    <SelectItem key={processo.id} value={processo.id}>
                      {processo.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {prazo ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
