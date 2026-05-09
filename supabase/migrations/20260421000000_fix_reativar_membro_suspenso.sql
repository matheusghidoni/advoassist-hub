-- Permite que um usuário suspenso reative seu próprio vínculo ao aceitar um convite válido.
--
-- Problema: ao aceitar convite via upsert, se o usuário já tinha sido removido
-- (status = 'suspenso'), o upsert tentava UPDATE na linha existente.
-- A policy "dono_admin_atualiza_membro" usa membro_escritorios() que só retorna
-- escritórios com status = 'ativo', então bloqueava o UPDATE para usuários suspensos.
--
-- Solução: policy adicional de UPDATE permitindo que o próprio usuário reative
-- seu vínculo suspenso desde que exista um convite válido para o escritório.

CREATE POLICY "usuario_reativa_proprio_convite"
  ON public.escritorio_membros FOR UPDATE
  USING (
    user_id = auth.uid()
    AND status = 'suspenso'
    AND EXISTS (
      SELECT 1 FROM public.convites c
      WHERE c.escritorio_id = escritorio_membros.escritorio_id
        AND c.aceito_em IS NULL
        AND c.expires_at > now()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'ativo'
  );
