import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { queryKeys } from './queryKeys';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MembroEquipe {
  id: string;
  escritorio_id: string;
  user_id: string;
  role: string;
  status: string;
  convidado_por: string | null;
  created_at: string;
  profiles: { full_name: string | null; oab: string | null } | null;
}

export interface ConvitePendente {
  id: string;
  escritorio_id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  aceito_em: string | null;
  convidado_por: string;
  created_at: string;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Load all active/invited members for the current escritório. */
export function useEquipe() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();

  return useQuery({
    queryKey: queryKeys.equipe(escritorioId ?? ''),
    queryFn: async (): Promise<MembroEquipe[]> => {
      const { data, error } = await supabase
        .from('escritorio_membros')
        .select(
          `id,
           escritorio_id,
           user_id,
           role,
           status,
           convidado_por,
           created_at,
           profiles!escritorio_membros_user_id_profiles_fkey(full_name, oab)`
        )
        .eq('escritorio_id', escritorioId!)
        .neq('status', 'suspenso')
        .order('created_at');

      if (error) throw error;

      return (data ?? []) as MembroEquipe[];
    },
    enabled: !!user && !!escritorioId,
  });
}

/** Load pending (not yet accepted, not expired) invites for the current escritório. */
export function useConvites() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();

  return useQuery({
    queryKey: [...queryKeys.equipe(escritorioId ?? ''), 'convites'],
    queryFn: async (): Promise<ConvitePendente[]> => {
      const { data, error } = await supabase
        .from('convites')
        .select(
          `id,
           escritorio_id,
           email,
           role,
           token,
           expires_at,
           aceito_em,
           convidado_por,
           created_at,
           escritorios(nome)`
        )
        .eq('escritorio_id', escritorioId!)
        .is('aceito_em', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []) as unknown as ConvitePendente[];
    },
    enabled: !!user && !!escritorioId,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

interface ConvidarMembroParams {
  email: string;
  role: string;
}

/** Insert a new invite into the `convites` table. */
export function useConvidarMembro() {
  const { user } = useAuth();
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role }: ConvidarMembroParams) => {
      const { error } = await supabase.from('convites').insert({
        escritorio_id: escritorioId!,
        email,
        role,
        convidado_por: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.equipe(escritorioId ?? '') });
      toast.success('Convite enviado com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao enviar convite: ${err.message}`);
    },
  });
}

interface UpdateRoleParams {
  id: string;
  role: string;
}

/** Update the role of an existing `escritorio_membros` row. */
export function useUpdateRoleMembro() {
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: UpdateRoleParams) => {
      const { error } = await supabase
        .from('escritorio_membros')
        .update({ role })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.equipe(escritorioId ?? '') });
      toast.success('Papel atualizado com sucesso!');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar papel: ${err.message}`);
    },
  });
}

/** Soft-remove a member by setting status = 'suspenso'. */
export function useRemoverMembro() {
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('escritorio_membros')
        .update({ status: 'suspenso' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.equipe(escritorioId ?? '') });
      toast.success('Membro removido da equipe');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao remover membro: ${err.message}`);
    },
  });
}

/** Hard-delete a pending invite. */
export function useCancelarConvite() {
  const { escritorioId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('convites').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.equipe(escritorioId ?? '') });
      toast.success('Convite cancelado');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao cancelar convite: ${err.message}`);
    },
  });
}
