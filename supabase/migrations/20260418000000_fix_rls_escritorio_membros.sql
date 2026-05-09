-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: RLS escritorio_membros INSERT — chicken-and-egg
--
-- Problema: a policy "dono_admin_adiciona_membro" exigia que o usuário já
-- fosse dono/admin de um escritório para conseguir inserir em escritorio_membros.
-- Isso bloqueava a criação do PRIMEIRO registro (o próprio dono do escritório).
--
-- Solução: adicionar uma cláusula OR que permite o INSERT quando:
--   a) O usuário é o owner_id do escritório sendo vinculado (auto-registro inicial)
--   OU
--   b) O usuário já é dono/admin do escritório (convidar outras pessoas)
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove a policy restritiva antiga
DROP POLICY IF EXISTS "dono_admin_adiciona_membro" ON public.escritorio_membros;

-- Recria permitindo o owner do escritório inserir seu próprio vínculo inicial
CREATE POLICY "dono_admin_adiciona_membro"
  ON public.escritorio_membros FOR INSERT
  WITH CHECK (
    -- Caso 1: o próprio owner do escritório criando seu registro inicial
    EXISTS (
      SELECT 1 FROM public.escritorios e
      WHERE e.id       = escritorio_membros.escritorio_id
      AND   e.owner_id = auth.uid()
    )
    OR
    -- Caso 2: dono/admin já existente adicionando outro membro
    EXISTS (
      SELECT 1 FROM public.escritorio_membros em2
      WHERE em2.escritorio_id = escritorio_membros.escritorio_id
      AND   em2.user_id       = auth.uid()
      AND   em2.role          IN ('dono', 'admin')
      AND   em2.status        = 'ativo'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: garantir que todos os usuários existentes tenham escritório + membro
-- Isso cobre casos onde o backfill anterior falhou silenciosamente
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  u    RECORD;
  eid  uuid;
BEGIN
  FOR u IN SELECT id, full_name FROM public.profiles LOOP

    -- Verificar se o usuário já tem ao menos um escritório
    IF NOT EXISTS (
      SELECT 1 FROM public.escritorio_membros
      WHERE user_id = u.id AND status = 'ativo'
    ) THEN

      -- Tentar reaproveitar escritório existente cujo owner é este usuário
      SELECT id INTO eid FROM public.escritorios WHERE owner_id = u.id LIMIT 1;

      IF eid IS NULL THEN
        -- Criar escritório pessoal
        INSERT INTO public.escritorios (owner_id, nome)
        VALUES (u.id, COALESCE(u.full_name, 'Meu Escritório'))
        RETURNING id INTO eid;
      END IF;

      -- Inserir membro (agora a policy permite pois é o owner)
      INSERT INTO public.escritorio_membros (escritorio_id, user_id, role)
      VALUES (eid, u.id, 'dono')
      ON CONFLICT DO NOTHING;

    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill de escritorio_id nas tabelas de negócio para dados órfãos
-- (linhas que ficaram sem escritorio_id após o backfill anterior falhar)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  u    RECORD;
  eid  uuid;
BEGIN
  FOR u IN SELECT id FROM public.profiles LOOP

    SELECT em.escritorio_id INTO eid
    FROM public.escritorio_membros em
    WHERE em.user_id = u.id AND em.status = 'ativo'
    ORDER BY em.created_at
    LIMIT 1;

    IF eid IS NOT NULL THEN
      UPDATE public.processos  SET escritorio_id = eid WHERE user_id = u.id AND escritorio_id IS NULL;
      UPDATE public.clientes   SET escritorio_id = eid WHERE user_id = u.id AND escritorio_id IS NULL;
      UPDATE public.prazos     SET escritorio_id = eid WHERE user_id = u.id AND escritorio_id IS NULL;
      UPDATE public.honorarios SET escritorio_id = eid WHERE user_id = u.id AND escritorio_id IS NULL;
      UPDATE public.despesas   SET escritorio_id = eid WHERE user_id = u.id AND escritorio_id IS NULL;
      UPDATE public.tarefas    SET escritorio_id = eid WHERE user_id = u.id AND escritorio_id IS NULL;
    END IF;
  END LOOP;
END $$;
