-- Permite que o usuário sempre veja TODAS as suas próprias memberships,
-- independente do status. Sem isso, a query do WorkspaceContext só retornava
-- o escritório pessoal, porque a policy "membros_veem_equipe" usa
-- membro_escritorios() que tem dependência circular para escritórios
-- onde a membership acabou de ser criada.
--
-- Também garante que a tabela escritorios seja legível para membros ativos.

CREATE POLICY "usuario_ve_proprias_memberships"
  ON public.escritorio_membros FOR SELECT
  USING (user_id = auth.uid());

-- Permitir que membros ativos leiam os dados do escritório ao qual pertencem
-- (necessário para o join `escritorios (*)` no WorkspaceContext)
DROP POLICY IF EXISTS "membros_leem_escritorio" ON public.escritorios;

CREATE POLICY "membros_leem_escritorio"
  ON public.escritorios FOR SELECT
  USING (
    id IN (
      SELECT escritorio_id
      FROM public.escritorio_membros
      WHERE user_id = auth.uid()
        AND status = 'ativo'
    )
  );
