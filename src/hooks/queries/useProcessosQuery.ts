import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { queryKeys } from './queryKeys';
import type { Database } from '@/integrations/supabase/types';

type ProcessoRow = Database['public']['Tables']['processos']['Row'];
type PrazoRow    = Database['public']['Tables']['prazos']['Row'];

export interface Processo extends ProcessoRow {
  clientes: { nome: string } | null;
  prazos: PrazoRow[];
}

/** Returns all processos (with prazos and cliente) for the current escritorio, cached. */
export function useProcessos() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.processos(escritorioId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processos')
        .select('*, clientes!processos_cliente_id_fkey(nome), prazos!fk_prazos_processo(*)')
        .eq('escritorio_id', escritorioId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as Processo[];
    },
    enabled: !!user && !!escritorioId,
  });
}

/** Mutation: toggle a prazo concluido flag and invalidate processos cache. */
export function useTogglePrazoConcluido() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prazoId, concluido }: { prazoId: string; concluido: boolean }) => {
      const { error } = await supabase
        .from('prazos')
        .update({ concluido: !concluido })
        .eq('id', prazoId);
      if (error) throw error;
    },
    onSuccess: (_data, { concluido }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.processos(escritorioId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.prazos(escritorioId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? '') });
      toast.success(concluido ? 'Prazo reaberto' : 'Prazo marcado como concluído');
    },
    onError: () => {
      toast.error('Erro ao atualizar prazo');
    },
  });
}

/** Mutation: delete a processo and invalidate the list cache. */
export function useDeleteProcesso() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('processos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.processos(escritorioId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? '') });
      toast.success('Processo excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir processo');
    },
  });
}
