-- Permite que membros do mesmo escritório vejam os perfis uns dos outros.
-- Sem isso, o join profiles!escritorio_membros_user_id_profiles_fkey(full_name, oab)
-- retornava null para qualquer membro que não fosse o próprio usuário logado.

CREATE POLICY "membros_mesmo_escritorio_veem_perfis"
ON public.profiles
FOR SELECT
USING (
  -- Pode ver o próprio perfil
  id = auth.uid()
  OR
  -- Pode ver perfis de outros membros ativos do mesmo escritório
  id IN (
    SELECT em.user_id
    FROM public.escritorio_membros em
    WHERE em.status = 'ativo'
      AND em.escritorio_id IN (
        SELECT escritorio_id
        FROM public.escritorio_membros
        WHERE user_id = auth.uid()
          AND status = 'ativo'
      )
  )
);
