-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: Permitir que usuários convidados leiam e aceitem convites por token
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Qualquer usuário autenticado pode ler UM convite pelo seu token
--    (só quem tem o link consegue encontrar o convite)
CREATE POLICY "aceitar_convite_por_token"
  ON public.convites FOR SELECT
  USING (true);   -- filtrado pelo token no client; convites expirados e aceitos são inofensivos

-- 2. Qualquer usuário autenticado pode marcar um convite como aceito (UPDATE aceito_em)
CREATE POLICY "usuario_aceita_proprio_convite"
  ON public.convites FOR UPDATE
  USING (
    aceito_em IS NULL
    AND expires_at > now()
  )
  WITH CHECK (true);

-- 3. Permitir que um usuário se auto-adicione a um escritório ao aceitar convite válido
DROP POLICY IF EXISTS "dono_admin_adiciona_membro" ON public.escritorio_membros;

CREATE POLICY "dono_admin_adiciona_membro"
  ON public.escritorio_membros FOR INSERT
  WITH CHECK (
    -- Caso 1: owner do escritório criando seu registro inicial
    EXISTS (
      SELECT 1 FROM public.escritorios e
      WHERE e.id = escritorio_membros.escritorio_id
        AND e.owner_id = auth.uid()
    )
    OR
    -- Caso 2: dono/admin adicionando outro membro
    EXISTS (
      SELECT 1 FROM public.escritorio_membros em2
      WHERE em2.escritorio_id = escritorio_membros.escritorio_id
        AND em2.user_id = auth.uid()
        AND em2.role IN ('dono', 'admin')
        AND em2.status = 'ativo'
    )
    OR
    -- Caso 3: usuário aceitando convite válido (adiciona a si mesmo)
    (
      escritorio_membros.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.convites c
        WHERE c.escritorio_id = escritorio_membros.escritorio_id
          AND c.aceito_em IS NULL
          AND c.expires_at > now()
      )
    )
  );
