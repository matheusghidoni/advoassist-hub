import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { queryKeys } from "./queryKeys";
import type { Database } from "@/integrations/supabase/types";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type RegistroHorasRow = Database["public"]["Tables"]["registros_horas"]["Row"];

export interface RegistroHoras extends RegistroHorasRow {
  processos: { numero: string; tipo: string } | null;
  clientes:  { nome: string }               | null;
}

export type CreateRegistroHorasInput = Omit<
  Database["public"]["Tables"]["registros_horas"]["Insert"],
  "user_id"
>;

export type UpdateRegistroHorasInput = {
  id: string;
  data: Database["public"]["Tables"]["registros_horas"]["Update"];
};

// ── Estatísticas derivadas ────────────────────────────────────────────────────

export interface TimesheetStats {
  totalHoras:      number;
  totalRegistros:  number;
  totalFaturado:   number;
  horasMes:        number;      // horas no mês corrente
  registrosMes:    number;
}

export function calcularStats(registros: RegistroHoras[]): TimesheetStats {
  const agora       = new Date();
  const mesAtual    = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;

  const registrosMes = registros.filter((r) => r.data.startsWith(mesAtual));

  return {
    totalHoras:     registros.reduce((acc, r) => acc + Number(r.horas), 0),
    totalRegistros: registros.length,
    totalFaturado:  registros.reduce((acc, r) => {
      if (r.valor_hora == null) return acc;
      return acc + Number(r.horas) * Number(r.valor_hora);
    }, 0),
    horasMes:    registrosMes.reduce((acc, r) => acc + Number(r.horas), 0),
    registrosMes: registrosMes.length,
  };
}

/** Formata horas decimais → "Xh Ymin" (ex.: 1.75 → "1h 45min") */
export function formatarHoras(horas: number): string {
  const h   = Math.floor(horas);
  const min = Math.round((horas - h) * 60);
  if (min === 0)  return `${h}h`;
  if (h === 0)    return `${min}min`;
  return `${h}h ${min}min`;
}

// ── Leitura ──────────────────────────────────────────────────────────────────

export function useRegistrosHoras() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.registrosHoras(escritorioId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registros_horas")
        .select(
          "*, " +
          "processos!registros_horas_processo_id_fkey(numero, tipo), " +
          "clientes!registros_horas_cliente_id_fkey(nome)"
        )
        .eq("escritorio_id", escritorioId!)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as RegistroHoras[];
    },
    enabled: !!user && !!escritorioId,
  });
}

// ── Criar ────────────────────────────────────────────────────────────────────

export function useCreateRegistroHoras() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRegistroHorasInput) => {
      const { error } = await supabase
        .from("registros_horas")
        .insert([{ ...input, user_id: user!.id, escritorio_id: escritorioId! }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrosHoras(escritorioId ?? "") });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? "") });
      toast.success("Registro de horas criado!");
    },
    onError: () => toast.error("Erro ao registrar horas"),
  });
}

// ── Atualizar ────────────────────────────────────────────────────────────────

export function useUpdateRegistroHoras() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateRegistroHorasInput) => {
      const { error } = await supabase
        .from("registros_horas")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrosHoras(escritorioId ?? "") });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? "") });
      toast.success("Registro atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar registro"),
  });
}

// ── Excluir ──────────────────────────────────────────────────────────────────

export function useDeleteRegistroHoras() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("registros_horas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.registrosHoras(escritorioId ?? "") });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? "") });
      toast.success("Registro excluído.");
    },
    onError: () => toast.error("Erro ao excluir registro"),
  });
}
