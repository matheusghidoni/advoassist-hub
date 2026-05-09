import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TipoComunicacao = "ligacao" | "email" | "reuniao" | "whatsapp" | "outro";
export type DirecaoComunicacao = "entrada" | "saida";

export interface Comunicacao {
  id: string;
  user_id: string;
  escritorio_id: string | null;
  cliente_id: string | null;
  processo_id: string | null;
  tipo: TipoComunicacao;
  direcao: DirecaoComunicacao;
  assunto: string;
  descricao: string | null;
  data: string;
  hora: string | null;
  duracao_minutos: number | null;
  created_at: string;
  updated_at: string;
  // joins
  profiles: { full_name: string | null } | null;
  clientes: { nome: string } | null;
  processos: { numero: string } | null;
}

export interface ComunicacaoInsert {
  cliente_id?: string | null;
  processo_id?: string | null;
  tipo: TipoComunicacao;
  direcao: DirecaoComunicacao;
  assunto: string;
  descricao?: string | null;
  data: string;
  hora?: string | null;
  duracao_minutos?: number | null;
}

// ── Labels e metadados por tipo ───────────────────────────────────────────────

export const TIPO_META: Record<TipoComunicacao, { label: string; color: string; bg: string }> = {
  ligacao:  { label: "Ligação",  color: "text-blue-600",  bg: "bg-blue-500/10 border-blue-500/20" },
  email:    { label: "E-mail",   color: "text-purple-600",bg: "bg-purple-500/10 border-purple-500/20" },
  reuniao:  { label: "Reunião",  color: "text-green-600", bg: "bg-green-500/10 border-green-500/20" },
  whatsapp: { label: "WhatsApp", color: "text-emerald-600",bg: "bg-emerald-500/10 border-emerald-500/20" },
  outro:    { label: "Outro",    color: "text-gray-600",  bg: "bg-gray-500/10 border-gray-500/20" },
};

export const DIRECAO_META: Record<DirecaoComunicacao, { label: string }> = {
  entrada: { label: "Recebida" },
  saida:   { label: "Enviada / Realizada" },
};

// ── Query key factory ─────────────────────────────────────────────────────────

export const comunicacaoKeys = {
  porCliente:  (clienteId: string)  => ["comunicacoes", "cliente",  clienteId]  as const,
  porProcesso: (processoId: string) => ["comunicacoes", "processo", processoId] as const,
  porEscritorio: (eid: string)      => ["comunicacoes", "escritorio", eid]      as const,
};

// ── Hook: por cliente ─────────────────────────────────────────────────────────

export function useComunicacoesPorCliente(clienteId: string | null) {
  return useQuery({
    queryKey: comunicacaoKeys.porCliente(clienteId ?? ""),
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comunicacoes")
        .select(`
          *,
          profiles(full_name),
          processos(numero)
        `)
        .eq("cliente_id", clienteId!)
        .order("data", { ascending: false })
        .order("hora", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data ?? []) as Comunicacao[];
    },
  });
}

// ── Hook: por processo ────────────────────────────────────────────────────────

export function useComunicacoesPorProcesso(processoId: string | null) {
  return useQuery({
    queryKey: comunicacaoKeys.porProcesso(processoId ?? ""),
    enabled: !!processoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comunicacoes")
        .select(`
          *,
          profiles(full_name),
          clientes(nome)
        `)
        .eq("processo_id", processoId!)
        .order("data", { ascending: false })
        .order("hora", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data ?? []) as Comunicacao[];
    },
  });
}

// ── Mutation: criar ───────────────────────────────────────────────────────────

export function useCreateComunicacao() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ComunicacaoInsert) => {
      const { error } = await supabase
        .from("comunicacoes")
        .insert({
          ...payload,
          user_id:       user!.id,
          escritorio_id: escritorioId ?? null,
        });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      if (variables.cliente_id) {
        qc.invalidateQueries({ queryKey: comunicacaoKeys.porCliente(variables.cliente_id) });
      }
      if (variables.processo_id) {
        qc.invalidateQueries({ queryKey: comunicacaoKeys.porProcesso(variables.processo_id) });
      }
      toast.success("Comunicação registrada!");
    },
    onError: (err: any) => {
      toast.error("Erro ao registrar comunicação: " + err.message);
    },
  });
}

// ── Mutation: atualizar ───────────────────────────────────────────────────────

export function useUpdateComunicacao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      clienteId,
      processoId,
      ...payload
    }: ComunicacaoInsert & { id: string; clienteId?: string | null; processoId?: string | null }) => {
      const { error } = await supabase
        .from("comunicacoes")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
      return { clienteId, processoId };
    },
    onSuccess: (_data, variables) => {
      if (variables.clienteId) {
        qc.invalidateQueries({ queryKey: comunicacaoKeys.porCliente(variables.clienteId) });
      }
      if (variables.processoId) {
        qc.invalidateQueries({ queryKey: comunicacaoKeys.porProcesso(variables.processoId) });
      }
      toast.success("Comunicação atualizada!");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar comunicação: " + err.message);
    },
  });
}

// ── Mutation: excluir ─────────────────────────────────────────────────────────

export function useDeleteComunicacao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      clienteId,
      processoId,
    }: {
      id: string;
      clienteId?: string | null;
      processoId?: string | null;
    }) => {
      const { error } = await supabase
        .from("comunicacoes")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { clienteId, processoId };
    },
    onSuccess: (_data, variables) => {
      if (variables.clienteId) {
        qc.invalidateQueries({ queryKey: comunicacaoKeys.porCliente(variables.clienteId) });
      }
      if (variables.processoId) {
        qc.invalidateQueries({ queryKey: comunicacaoKeys.porProcesso(variables.processoId) });
      }
      toast.success("Comunicação excluída.");
    },
    onError: () => toast.error("Erro ao excluir comunicação"),
  });
}
