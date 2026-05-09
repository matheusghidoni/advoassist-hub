import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { queryKeys } from "./queryKeys";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Despesa {
  id: string;
  user_id: string;
  processo_id: string | null;
  cliente_id: string | null;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  status: "pendente" | "pago";
  comprovante_path: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // joins
  processos?: { numero: string; tipo: string } | null;
  clientes?: { nome: string } | null;
}

export interface DespesaInsert {
  processo_id?: string | null;
  cliente_id?: string | null;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  status?: "pendente" | "pago";
  comprovante_path?: string | null;
  observacoes?: string | null;
}

// ── Labels / metadata ─────────────────────────────────────────────────────────

export const CATEGORIAS_DESPESA: Record<string, { label: string; color: string }> = {
  custas_judiciais:   { label: "Custas Judiciais",   color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  honorarios_peritos: { label: "Honorários de Peritos", color: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  deslocamento:       { label: "Deslocamento",        color: "bg-orange-500/10 text-orange-700 border-orange-500/20" },
  correios:           { label: "Correios / Postagem", color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  copias:             { label: "Cópias / Impressões", color: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20" },
  diligencias:        { label: "Diligências",         color: "bg-teal-500/10 text-teal-700 border-teal-500/20" },
  outros:             { label: "Outros",               color: "bg-gray-500/10 text-gray-700 border-gray-500/20" },
};

// ── Stats helper ──────────────────────────────────────────────────────────────

export interface DespesaStats {
  totalGeral: number;
  totalPago: number;
  totalPendente: number;
  porCategoria: Record<string, number>;
}

export function calcularStatsDespesas(despesas: Despesa[]): DespesaStats {
  const totalGeral    = despesas.reduce((s, d) => s + d.valor, 0);
  const totalPago     = despesas.filter(d => d.status === "pago").reduce((s, d) => s + d.valor, 0);
  const totalPendente = despesas.filter(d => d.status === "pendente").reduce((s, d) => s + d.valor, 0);
  const porCategoria  = despesas.reduce((acc, d) => {
    acc[d.categoria] = (acc[d.categoria] || 0) + d.valor;
    return acc;
  }, {} as Record<string, number>);
  return { totalGeral, totalPago, totalPendente, porCategoria };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useDespesas() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.despesas(escritorioId ?? ""),
    enabled: !!user && !!escritorioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("despesas")
        .select(`
          *,
          processos(numero, tipo),
          clientes(nome)
        `)
        .eq("escritorio_id", escritorioId!)
        .order("data", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Despesa[];
    },
  });
}

export function useCreateDespesa() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DespesaInsert) => {
      const { error } = await supabase
        .from("despesas")
        .insert({ ...payload, user_id: user!.id, escritorio_id: escritorioId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.despesas(escritorioId ?? "") });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? "") });
      toast.success("Despesa registrada com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao registrar despesa: " + err.message);
    },
  });
}

export function useUpdateDespesa() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: DespesaInsert & { id: string }) => {
      const { error } = await supabase
        .from("despesas")
        .update(payload)
        .eq("id", id)
        .eq("escritorio_id", escritorioId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.despesas(escritorioId ?? "") });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? "") });
      toast.success("Despesa atualizada com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar despesa: " + err.message);
    },
  });
}

export function useDeleteDespesa() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("despesas")
        .delete()
        .eq("id", id)
        .eq("escritorio_id", escritorioId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.despesas(escritorioId ?? "") });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? "") });
      toast.success("Despesa excluída com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir despesa: " + err.message);
    },
  });
}
