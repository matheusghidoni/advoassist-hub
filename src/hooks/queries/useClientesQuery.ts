import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { queryKeys } from './queryKeys';
import type { Database } from '@/integrations/supabase/types';

export type Cliente = Database['public']['Tables']['clientes']['Row'];

/** Returns all clientes for the current escritorio, cached by React Query. */
export function useClientes() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.clientes(escritorioId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('escritorio_id', escritorioId!)
        .order('nome');

      if (error) throw error;
      return data ?? [] as Cliente[];
    },
    enabled: !!user && !!escritorioId,
  });
}

/** Mutation: delete a cliente and invalidate the list cache. */
export function useDeleteCliente() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientes(escritorioId ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(escritorioId ?? '') });
      toast.success('Cliente excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir cliente');
    },
  });
}
