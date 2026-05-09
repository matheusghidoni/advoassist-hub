import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { queryKeys } from './queryKeys';
import type { Database } from '@/integrations/supabase/types';

type HonorarioRow = Database['public']['Tables']['honorarios']['Row'];

export interface Honorario extends HonorarioRow {
  processos: {
    numero: string;
    clientes: { nome: string } | null;
  } | null;
  clientes: { nome: string } | null;
}

/** Returns all honorarios (with processo/cliente) for the current escritorio, cached. */
export function useHonorarios() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.honorarios(escritorioId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('honorarios')
        .select(`
          *,
          processos!honorarios_processo_id_fkey (
            numero,
            clientes!processos_cliente_id_fkey (nome)
          ),
          clientes!honorarios_cliente_id_fkey (nome)
        `)
        .eq('escritorio_id', escritorioId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as Honorario[];
    },
    enabled: !!user && !!escritorioId,
  });
}

/** Mutation: delete an honorario. */
export function useDeleteHonorario() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('honorarios').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.honorarios(escritorioId ?? '') });
      toast.success('Honorário deletado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao deletar honorário');
    },
  });
}
