import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { queryKeys } from './queryKeys';
import type { Database } from '@/integrations/supabase/types';

type PrazoRow = Database['public']['Tables']['prazos']['Row'];

export interface Prazo extends PrazoRow {
  processos: { numero: string } | null;
}

/** Returns all prazos (with processo number) for the current escritorio, cached. */
export function usePrazos() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.prazos(escritorioId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prazos')
        .select('*, processos!prazos_processo_id_fkey(numero)')
        .eq('escritorio_id', escritorioId!)
        .order('data');

      if (error) throw error;
      return (data ?? []) as Prazo[];
    },
    enabled: !!user && !!escritorioId,
  });
}

/** Mutation: move a prazo to a new date. */
export function useMovePrazo() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prazoId, newDate }: { prazoId: string; newDate: string }) => {
      const { error } = await supabase
        .from('prazos')
        .update({ data: newDate })
        .eq('id', prazoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prazos(escritorioId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? '') });
    },
    onError: () => {
      toast.error('Erro ao atualizar data do prazo');
    },
  });
}

/** Mutation: toggle concluido flag on a prazo. */
export function useTogglePrazo() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prazoId, concluido }: { prazoId: string; concluido: boolean }) => {
      const { error } = await supabase
        .from('prazos')
        .update({ concluido })
        .eq('id', prazoId);
      if (error) throw error;
    },
    onSuccess: (_data, { concluido }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prazos(escritorioId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.processos(escritorioId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? '') });
      toast.success(concluido ? 'Prazo marcado como concluído' : 'Prazo marcado como pendente');
    },
    onError: () => {
      toast.error('Erro ao atualizar prazo');
    },
  });
}

/** Mutation: delete a prazo. */
export function useDeletePrazo() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('prazos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prazos(escritorioId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.processos(escritorioId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? '') });
      toast.success('Prazo excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir prazo');
    },
  });
}
