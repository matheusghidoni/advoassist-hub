import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { queryKeys } from "./queryKeys";
import type { Database } from "@/integrations/supabase/types";

export type Andamento = Database["public"]["Tables"]["andamentos_processuais"]["Row"];

export type AndamentoTipo =
  | "audiencia"
  | "decisao"
  | "despacho"
  | "sentenca"
  | "recurso"
  | "citacao"
  | "intimacao"
  | "acordo"
  | "peticao"
  | "outros";

export const ANDAMENTO_TIPO_OPTIONS: { value: AndamentoTipo; label: string }[] = [
  { value: "audiencia",  label: "Audiência" },
  { value: "decisao",   label: "Decisão" },
  { value: "despacho",  label: "Despacho" },
  { value: "sentenca",  label: "Sentença" },
  { value: "recurso",   label: "Recurso" },
  { value: "citacao",   label: "Citação" },
  { value: "intimacao", label: "Intimação" },
  { value: "acordo",    label: "Acordo" },
  { value: "peticao",   label: "Petição" },
  { value: "outros",    label: "Outros" },
];

// ── Read ────────────────────────────────────────────────────────────────────

export function useAndamentos(processoId: string) {
  return useQuery({
    queryKey: queryKeys.andamentos(processoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("andamentos_processuais")
        .select("*")
        .eq("processo_id", processoId)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Andamento[];
    },
    enabled: !!processoId,
  });
}

// ── Create ──────────────────────────────────────────────────────────────────

interface CreateAndamentoInput {
  processo_id: string;
  data: string;
  tipo: string;
  descricao: string;
}

export function useCreateAndamento() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAndamentoInput) => {
      const { error } = await supabase
        .from("andamentos_processuais")
        .insert([{ ...input, user_id: user!.id, escritorio_id: escritorioId ?? undefined }]);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.andamentos(variables.processo_id),
      });
    },
  });
}

// ── Delete ──────────────────────────────────────────────────────────────────

export function useDeleteAndamento(processoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (andamentoId: string) => {
      const { error } = await supabase
        .from("andamentos_processuais")
        .delete()
        .eq("id", andamentoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.andamentos(processoId),
      });
    },
  });
}
