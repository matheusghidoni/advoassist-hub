import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { queryKeys } from "./queryKeys";
import type { Database } from "@/integrations/supabase/types";

type TarefaRow = Database["public"]["Tables"]["tarefas"]["Row"];

export interface Tarefa extends TarefaRow {
  processos:       { numero: string } | null;
  clientes:        { nome: string }  | null;
  delegado_perfil: { full_name: string | null } | null;
}

export type TarefaStatus    = "pendente" | "em_andamento" | "concluida" | "cancelada";
export type TarefaPrioridade = "baixa" | "media" | "alta" | "urgente";

export const TAREFA_STATUS_OPTIONS: { value: TarefaStatus; label: string }[] = [
  { value: "pendente",     label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida",    label: "Concluída" },
  { value: "cancelada",    label: "Cancelada" },
];

export const TAREFA_PRIORIDADE_OPTIONS: { value: TarefaPrioridade; label: string }[] = [
  { value: "baixa",    label: "Baixa" },
  { value: "media",    label: "Média" },
  { value: "alta",     label: "Alta" },
  { value: "urgente",  label: "Urgente" },
];

// ── Leitura ──────────────────────────────────────────────────────────────────

export function useTarefas() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.tarefas(escritorioId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarefas")
        .select(`
          *,
          processos!tarefas_processo_id_fkey(numero),
          clientes!tarefas_cliente_id_fkey(nome),
          delegado_perfil:profiles!tarefas_delegado_a_profiles_fkey(full_name)
        `)
        .eq("escritorio_id", escritorioId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Tarefa[];
    },
    enabled: !!user && !!escritorioId,
  });
}

// ── Criar ────────────────────────────────────────────────────────────────────

export type CreateTarefaInput = Omit<
  Database["public"]["Tables"]["tarefas"]["Insert"],
  "user_id"
>;

export function useCreateTarefa() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTarefaInput) => {
      const { error } = await supabase
        .from("tarefas")
        .insert([{ ...input, user_id: user!.id, escritorio_id: escritorioId! }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tarefas(escritorioId ?? "") });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? "") });
      toast.success("Tarefa criada com sucesso!");
    },
    onError: () => toast.error("Erro ao criar tarefa"),
  });
}

// ── Atualizar ────────────────────────────────────────────────────────────────

interface UpdateTarefaInput {
  id: string;
  data: Database["public"]["Tables"]["tarefas"]["Update"];
}

export function useUpdateTarefa() {
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateTarefaInput) => {
      const { error } = await supabase
        .from("tarefas")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tarefas(escritorioId ?? "") });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? "") });
    },
    onError: () => toast.error("Erro ao atualizar tarefa"),
  });
}

// ── Delegar tarefa ────────────────────────────────────────────────────────────

export function useDelegarTarefa() {
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, delegado_a }: { id: string; delegado_a: string | null }) => {
      const { error } = await supabase
        .from("tarefas")
        .update({ delegado_a })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { delegado_a }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tarefas(escritorioId ?? "") });
      toast.success(delegado_a ? "Tarefa delegada com sucesso!" : "Delegação removida.");
    },
    onError: () => toast.error("Erro ao delegar tarefa"),
  });
}

// ── Mover status (drag-and-drop / botão) ─────────────────────────────────────

export function useMoverTarefa() {
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TarefaStatus }) => {
      const { error } = await supabase
        .from("tarefas")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tarefas(escritorioId ?? "") });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? "") });
      const labels: Record<TarefaStatus, string> = {
        pendente:     "Pendente",
        em_andamento: "Em andamento",
        concluida:    "Concluída",
        cancelada:    "Cancelada",
      };
      toast.success(`Tarefa movida para ${labels[status]}`);
    },
    onError: () => toast.error("Erro ao mover tarefa"),
  });
}

// ── Excluir ──────────────────────────────────────────────────────────────────

export function useDeleteTarefa() {
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tarefas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tarefas(escritorioId ?? "") });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? "") });
      toast.success("Tarefa excluída.");
    },
    onError: () => toast.error("Erro ao excluir tarefa"),
  });
}
