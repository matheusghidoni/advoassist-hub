import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateTarefa,
  useUpdateTarefa,
  TAREFA_PRIORIDADE_OPTIONS,
  TAREFA_STATUS_OPTIONS,
  type Tarefa,
  type TarefaStatus,
  type TarefaPrioridade,
} from "@/hooks/queries/useTarefasQuery";

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  titulo:          z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  descricao:       z.string().optional(),
  prioridade:      z.string(),
  status:          z.string(),
  data_vencimento: z.string().optional(),
  processo_id:     z.string().optional(),
  cliente_id:      z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ── Tipos locais para os selects ──────────────────────────────────────────────

interface ProcessoOpt { id: string; numero: string }
interface ClienteOpt  { id: string; nome: string }

// ── Props ─────────────────────────────────────────────────────────────────────

interface TarefaFormProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  onSuccess:     () => void;
  tarefa?:       Tarefa | null;
  /** Pré-vincula a um processo ao criar pelo card do processo */
  defaultProcessoId?: string;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function TarefaForm({ open, onOpenChange, onSuccess, tarefa, defaultProcessoId }: TarefaFormProps) {
  const { user } = useAuth();
  const createTarefa = useCreateTarefa();
  const updateTarefa = useUpdateTarefa();
  const loading      = createTarefa.isPending || updateTarefa.isPending;

  const [processos, setProcessos] = useState<ProcessoOpt[]>([]);
  const [clientes,  setClientes]  = useState<ClienteOpt[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      prioridade: "media",
      status:     "pendente",
      processo_id: defaultProcessoId,
    },
  });

  const prioridade  = watch("prioridade");
  const status      = watch("status");
  const processo_id = watch("processo_id");
  const cliente_id  = watch("cliente_id");

  // Carrega listas de vinculação
  useEffect(() => {
    if (!open || !user) return;
    Promise.all([
      supabase.from("processos").select("id, numero").eq("user_id", user.id).order("numero"),
      supabase.from("clientes").select("id, nome").eq("user_id", user.id).order("nome"),
    ]).then(([proc, cli]) => {
      if (proc.data) setProcessos(proc.data);
      if (cli.data)  setClientes(cli.data);
    });
  }, [open, user]);

  // Preenche o form ao editar
  useEffect(() => {
    if (tarefa) {
      reset({
        titulo:          tarefa.titulo,
        descricao:       tarefa.descricao ?? "",
        prioridade:      tarefa.prioridade,
        status:          tarefa.status,
        data_vencimento: tarefa.data_vencimento ?? "",
        processo_id:     tarefa.processo_id ?? undefined,
        cliente_id:      tarefa.cliente_id  ?? undefined,
      });
    } else {
      reset({
        titulo:          "",
        descricao:       "",
        prioridade:      "media",
        status:          "pendente",
        data_vencimento: "",
        processo_id:     defaultProcessoId,
        cliente_id:      undefined,
      });
    }
  }, [tarefa, open, reset, defaultProcessoId]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      titulo:          data.titulo,
      descricao:       data.descricao || null,
      prioridade:      data.prioridade as TarefaPrioridade,
      status:          data.status    as TarefaStatus,
      data_vencimento: data.data_vencimento || null,
      processo_id:     data.processo_id || null,
      cliente_id:      data.cliente_id  || null,
    };

    if (tarefa) {
      await updateTarefa.mutateAsync({ id: tarefa.id, data: payload });
    } else {
      await createTarefa.mutateAsync(payload);
    }

    reset();
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{tarefa ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Título */}
          <div className="space-y-1">
            <Label htmlFor="titulo-tarefa">Título *</Label>
            <Input id="titulo-tarefa" {...register("titulo")} />
            {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label htmlFor="descricao-tarefa">Descrição</Label>
            <Textarea id="descricao-tarefa" {...register("descricao")} rows={2} className="resize-none" />
          </div>

          {/* Prioridade + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setValue("prioridade", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAREFA_PRIORIDADE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAREFA_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data de vencimento */}
          <div className="space-y-1">
            <Label htmlFor="venc-tarefa">Data de vencimento (opcional)</Label>
            <Input id="venc-tarefa" type="date" {...register("data_vencimento")} />
          </div>

          {/* Processo */}
          <div className="space-y-1">
            <Label>Processo (opcional)</Label>
            <Select
              value={processo_id ?? "none"}
              onValueChange={(v) => setValue("processo_id", v === "none" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum processo vinculado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {processos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.numero}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cliente */}
          <div className="space-y-1">
            <Label>Cliente (opcional)</Label>
            <Select
              value={cliente_id ?? "none"}
              onValueChange={(v) => setValue("cliente_id", v === "none" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum cliente vinculado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tarefa ? "Atualizar" : "Criar tarefa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
