-- ══════════════════════════════════════════════════════════════════════════════
-- Multi-Usuário / Escritório — Migração Estrutural
-- ══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 1 — Tabelas novas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.escritorios (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  nome       text        NOT NULL,
  cnpj       text,
  telefone   text,
  email      text,
  endereco   text,
  logo_path  text,
  plano      text        NOT NULL DEFAULT 'basico'
                         CHECK (plano IN ('basico','profissional','enterprise')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.escritorio_membros (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id   uuid        NOT NULL REFERENCES public.escritorios(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text        NOT NULL DEFAULT 'advogado'
                              CHECK (role IN ('dono','admin','advogado','estagiario','secretaria')),
  status          text        NOT NULL DEFAULT 'ativo'
                              CHECK (status IN ('ativo','convidado','suspenso')),
  convidado_por   uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escritorio_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.convites (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id   uuid        NOT NULL REFERENCES public.escritorios(id) ON DELETE CASCADE,
  email           text        NOT NULL,
  role            text        NOT NULL DEFAULT 'advogado'
                              CHECK (role IN ('admin','advogado','estagiario','secretaria')),
  token           text        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '48 hours',
  aceito_em       timestamptz,
  convidado_por   uuid        NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 2 — Adicionar escritorio_id e atribuido_a nas tabelas existentes
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.clientes          ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id) ON DELETE CASCADE;
ALTER TABLE public.processos         ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id) ON DELETE CASCADE;
ALTER TABLE public.prazos            ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id) ON DELETE CASCADE;
ALTER TABLE public.honorarios        ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id) ON DELETE CASCADE;
ALTER TABLE public.despesas          ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id) ON DELETE CASCADE;
ALTER TABLE public.tarefas           ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id) ON DELETE CASCADE;
ALTER TABLE public.tarefas           ADD COLUMN IF NOT EXISTS atribuido_a   uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.registros_horas   ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id) ON DELETE CASCADE;
ALTER TABLE public.andamentos_processuais ADD COLUMN IF NOT EXISTS escritorio_id uuid REFERENCES public.escritorios(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 3 — Trigger updated_at para escritorios
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_escritorios_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_escritorios_updated_at ON public.escritorios;
CREATE TRIGGER set_escritorios_updated_at
  BEFORE UPDATE ON public.escritorios
  FOR EACH ROW EXECUTE FUNCTION public.update_escritorios_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 4 — Helper function para RLS (escritórios do usuário atual)
-- ─────────────────────────────────────────────────────────────────────────────

-- Função no schema public (auth schema não aceita funções via migration)
CREATE OR REPLACE FUNCTION public.membro_escritorios()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(array_agg(escritorio_id), ARRAY[]::uuid[])
  FROM   public.escritorio_membros
  WHERE  user_id = auth.uid()
  AND    status  = 'ativo';
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 5 — Backfill: criar escritório pessoal para cada usuário existente
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  u   RECORD;
  eid uuid;
BEGIN
  FOR u IN SELECT id FROM auth.users LOOP

    -- Pular se já tem escritório
    SELECT id INTO eid FROM public.escritorios WHERE owner_id = u.id LIMIT 1;

    IF eid IS NULL THEN
      INSERT INTO public.escritorios (owner_id, nome, cnpj, endereco)
      SELECT
        u.id,
        COALESCE(p.office_name, p.full_name, 'Meu Escritório'),
        p.cnpj,
        p.office_address
      FROM public.profiles p
      WHERE p.id = u.id
      RETURNING id INTO eid;
    END IF;

    IF eid IS NULL THEN
      -- Perfil ainda não existe; criar escritório com nome padrão
      INSERT INTO public.escritorios (owner_id, nome)
      VALUES (u.id, 'Meu Escritório')
      RETURNING id INTO eid;
    END IF;

    -- Adicionar como dono
    INSERT INTO public.escritorio_membros (escritorio_id, user_id, role)
    VALUES (eid, u.id, 'dono')
    ON CONFLICT (escritorio_id, user_id) DO NOTHING;

    -- Backfill tabelas de negócio
    UPDATE public.clientes          SET escritorio_id = eid WHERE user_id = u.id AND escritorio_id IS NULL;
    UPDATE public.processos         SET escritorio_id = eid WHERE user_id = u.id AND escritorio_id IS NULL;
    UPDATE public.prazos            SET escritorio_id = eid WHERE user_id = u.id AND escritorio_id IS NULL;
    UPDATE public.honorarios        SET escritorio_id = eid WHERE user_id = u.id AND escritorio_id IS NULL;
    UPDATE public.despesas          SET escritorio_id = eid WHERE user_id = u.id AND escritorio_id IS NULL;
    UPDATE public.tarefas           SET escritorio_id = eid WHERE user_id = u.id AND escritorio_id IS NULL;
    UPDATE public.registros_horas   SET escritorio_id = eid WHERE user_id = u.id AND escritorio_id IS NULL;

    -- Andamentos: popular via processo
    UPDATE public.andamentos_processuais
    SET    escritorio_id = eid
    FROM   public.processos pr
    WHERE  andamentos_processuais.processo_id = pr.id
    AND    pr.user_id                         = u.id
    AND    andamentos_processuais.escritorio_id IS NULL;

  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 6 — Trigger: auto-criar escritório para novos usuários
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_escritorio_on_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  eid uuid;
BEGIN
  -- Só cria se ainda não existe
  IF EXISTS (SELECT 1 FROM public.escritorios WHERE owner_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.escritorios (owner_id, nome, cnpj, endereco)
  VALUES (
    NEW.id,
    COALESCE(NEW.office_name, NEW.full_name, 'Meu Escritório'),
    NEW.cnpj,
    NEW.office_address
  )
  RETURNING id INTO eid;

  INSERT INTO public.escritorio_membros (escritorio_id, user_id, role)
  VALUES (eid, NEW.id, 'dono');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_escritorio ON public.profiles;
CREATE TRIGGER auto_create_escritorio
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_escritorio_on_new_profile();

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 7 — RLS: escritorios
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.escritorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membros_veem_escritorio"
  ON public.escritorios FOR SELECT
  USING (id = ANY(public.membro_escritorios()));

CREATE POLICY "qualquer_autenticado_cria_escritorio"
  ON public.escritorios FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "dono_admin_atualiza_escritorio"
  ON public.escritorios FOR UPDATE
  USING (
    id = ANY(public.membro_escritorios())
    AND EXISTS (
      SELECT 1 FROM public.escritorio_membros em
      WHERE em.escritorio_id = escritorios.id
      AND   em.user_id       = auth.uid()
      AND   em.role          IN ('dono','admin')
      AND   em.status        = 'ativo'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 8 — RLS: escritorio_membros
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.escritorio_membros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membros_veem_equipe"
  ON public.escritorio_membros FOR SELECT
  USING (escritorio_id = ANY(public.membro_escritorios()));

CREATE POLICY "dono_admin_adiciona_membro"
  ON public.escritorio_membros FOR INSERT
  WITH CHECK (
    escritorio_id = ANY(public.membro_escritorios())
    AND EXISTS (
      SELECT 1 FROM public.escritorio_membros em2
      WHERE em2.escritorio_id = escritorio_membros.escritorio_id
      AND   em2.user_id       = auth.uid()
      AND   em2.role          IN ('dono','admin')
      AND   em2.status        = 'ativo'
    )
  );

CREATE POLICY "dono_admin_atualiza_membro"
  ON public.escritorio_membros FOR UPDATE
  USING (escritorio_id = ANY(public.membro_escritorios()));

CREATE POLICY "dono_admin_remove_membro"
  ON public.escritorio_membros FOR DELETE
  USING (
    escritorio_id = ANY(public.membro_escritorios())
    AND EXISTS (
      SELECT 1 FROM public.escritorio_membros em2
      WHERE em2.escritorio_id = escritorio_membros.escritorio_id
      AND   em2.user_id       = auth.uid()
      AND   em2.role          IN ('dono','admin')
      AND   em2.status        = 'ativo'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 9 — RLS: convites
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dono_admin_vee_convites"
  ON public.convites FOR SELECT
  USING (
    escritorio_id = ANY(public.membro_escritorios())
    AND EXISTS (
      SELECT 1 FROM public.escritorio_membros em
      WHERE em.escritorio_id = convites.escritorio_id
      AND   em.user_id       = auth.uid()
      AND   em.role          IN ('dono','admin')
      AND   em.status        = 'ativo'
    )
  );

CREATE POLICY "dono_admin_cria_convite"
  ON public.convites FOR INSERT
  WITH CHECK (
    escritorio_id = ANY(public.membro_escritorios())
    AND convidado_por = auth.uid()
  );

CREATE POLICY "dono_admin_deleta_convite"
  ON public.convites FOR DELETE
  USING (
    escritorio_id = ANY(public.membro_escritorios())
    AND EXISTS (
      SELECT 1 FROM public.escritorio_membros em
      WHERE em.escritorio_id = convites.escritorio_id
      AND   em.user_id       = auth.uid()
      AND   em.role          IN ('dono','admin')
      AND   em.status        = 'ativo'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 10 — Revogar e recriar RLS das tabelas de negócio
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper para revogar todas as policies existentes de uma tabela
CREATE OR REPLACE FUNCTION pg_temp.drop_all_policies(tbl text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE pol text;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
  END LOOP;
END;
$$;

SELECT pg_temp.drop_all_policies('clientes');
SELECT pg_temp.drop_all_policies('processos');
SELECT pg_temp.drop_all_policies('prazos');
SELECT pg_temp.drop_all_policies('honorarios');
SELECT pg_temp.drop_all_policies('despesas');
SELECT pg_temp.drop_all_policies('tarefas');
SELECT pg_temp.drop_all_policies('registros_horas');
SELECT pg_temp.drop_all_policies('andamentos_processuais');
SELECT pg_temp.drop_all_policies('processo_documentos');
SELECT pg_temp.drop_all_policies('cliente_documentos');

-- ── clientes ──────────────────────────────────────────────────────────────────

CREATE POLICY "esc_sel_clientes"  ON public.clientes FOR SELECT  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_ins_clientes"  ON public.clientes FOR INSERT  WITH CHECK (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_upd_clientes"  ON public.clientes FOR UPDATE  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_del_clientes"  ON public.clientes FOR DELETE
  USING (
    escritorio_id = ANY(public.membro_escritorios())
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.escritorio_membros em
      WHERE em.escritorio_id = clientes.escritorio_id AND em.user_id = auth.uid()
      AND em.role IN ('dono','admin') AND em.status = 'ativo'
    ))
  );

-- ── processos ─────────────────────────────────────────────────────────────────

CREATE POLICY "esc_sel_processos" ON public.processos FOR SELECT  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_ins_processos" ON public.processos FOR INSERT  WITH CHECK (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_upd_processos" ON public.processos FOR UPDATE  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_del_processos" ON public.processos FOR DELETE
  USING (
    escritorio_id = ANY(public.membro_escritorios())
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.escritorio_membros em
      WHERE em.escritorio_id = processos.escritorio_id AND em.user_id = auth.uid()
      AND em.role IN ('dono','admin') AND em.status = 'ativo'
    ))
  );

-- ── prazos ────────────────────────────────────────────────────────────────────

CREATE POLICY "esc_sel_prazos" ON public.prazos FOR SELECT  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_ins_prazos" ON public.prazos FOR INSERT  WITH CHECK (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_upd_prazos" ON public.prazos FOR UPDATE  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_del_prazos" ON public.prazos FOR DELETE  USING (escritorio_id = ANY(public.membro_escritorios()));

-- ── honorarios ────────────────────────────────────────────────────────────────

CREATE POLICY "esc_sel_honorarios" ON public.honorarios FOR SELECT  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_ins_honorarios" ON public.honorarios FOR INSERT  WITH CHECK (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_upd_honorarios" ON public.honorarios FOR UPDATE  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_del_honorarios" ON public.honorarios FOR DELETE  USING (escritorio_id = ANY(public.membro_escritorios()));

-- ── despesas ──────────────────────────────────────────────────────────────────

CREATE POLICY "esc_sel_despesas" ON public.despesas FOR SELECT  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_ins_despesas" ON public.despesas FOR INSERT  WITH CHECK (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_upd_despesas" ON public.despesas FOR UPDATE  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_del_despesas" ON public.despesas FOR DELETE  USING (escritorio_id = ANY(public.membro_escritorios()));

-- ── tarefas ───────────────────────────────────────────────────────────────────

CREATE POLICY "esc_sel_tarefas" ON public.tarefas FOR SELECT  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_ins_tarefas" ON public.tarefas FOR INSERT  WITH CHECK (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_upd_tarefas" ON public.tarefas FOR UPDATE  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_del_tarefas" ON public.tarefas FOR DELETE
  USING (
    escritorio_id = ANY(public.membro_escritorios())
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.escritorio_membros em
      WHERE em.escritorio_id = tarefas.escritorio_id AND em.user_id = auth.uid()
      AND em.role IN ('dono','admin') AND em.status = 'ativo'
    ))
  );

-- ── registros_horas ───────────────────────────────────────────────────────────

CREATE POLICY "esc_sel_reg_horas" ON public.registros_horas FOR SELECT  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_ins_reg_horas" ON public.registros_horas FOR INSERT  WITH CHECK (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_upd_reg_horas" ON public.registros_horas FOR UPDATE  USING (escritorio_id = ANY(public.membro_escritorios()));
CREATE POLICY "esc_del_reg_horas" ON public.registros_horas FOR DELETE  USING (escritorio_id = ANY(public.membro_escritorios()));

-- ── andamentos_processuais ────────────────────────────────────────────────────

CREATE POLICY "esc_sel_andamentos" ON public.andamentos_processuais FOR SELECT
  USING (
    escritorio_id = ANY(public.membro_escritorios())
    OR EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = andamentos_processuais.processo_id
      AND   p.escritorio_id = ANY(public.membro_escritorios())
    )
  );
CREATE POLICY "esc_ins_andamentos" ON public.andamentos_processuais FOR INSERT
  WITH CHECK (
    (escritorio_id IS NOT NULL AND escritorio_id = ANY(public.membro_escritorios()))
    OR EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = andamentos_processuais.processo_id
      AND   p.escritorio_id = ANY(public.membro_escritorios())
    )
  );
CREATE POLICY "esc_del_andamentos" ON public.andamentos_processuais FOR DELETE
  USING (
    escritorio_id = ANY(public.membro_escritorios())
    OR EXISTS (
      SELECT 1 FROM public.processos p
      WHERE p.id = andamentos_processuais.processo_id
      AND   p.escritorio_id = ANY(public.membro_escritorios())
    )
  );

-- ── processo_documentos ───────────────────────────────────────────────────────

CREATE POLICY "esc_sel_proc_docs" ON public.processo_documentos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = processo_documentos.processo_id
    AND   p.escritorio_id = ANY(public.membro_escritorios())
  ));
CREATE POLICY "esc_ins_proc_docs" ON public.processo_documentos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = processo_documentos.processo_id
    AND   p.escritorio_id = ANY(public.membro_escritorios())
  ));
CREATE POLICY "esc_del_proc_docs" ON public.processo_documentos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = processo_documentos.processo_id
    AND   p.escritorio_id = ANY(public.membro_escritorios())
  ));

-- ── cliente_documentos ────────────────────────────────────────────────────────

CREATE POLICY "esc_sel_cli_docs" ON public.cliente_documentos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = cliente_documentos.cliente_id
    AND   c.escritorio_id = ANY(public.membro_escritorios())
  ));
CREATE POLICY "esc_ins_cli_docs" ON public.cliente_documentos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = cliente_documentos.cliente_id
    AND   c.escritorio_id = ANY(public.membro_escritorios())
  ));
CREATE POLICY "esc_del_cli_docs" ON public.cliente_documentos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = cliente_documentos.cliente_id
    AND   c.escritorio_id = ANY(public.membro_escritorios())
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 11 — Índices adicionais
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS escritorios_owner_id_idx           ON public.escritorios(owner_id);
CREATE INDEX IF NOT EXISTS escritorio_membros_user_id_idx     ON public.escritorio_membros(user_id);
CREATE INDEX IF NOT EXISTS escritorio_membros_escritorio_idx  ON public.escritorio_membros(escritorio_id);
CREATE INDEX IF NOT EXISTS convites_token_idx                 ON public.convites(token);
CREATE INDEX IF NOT EXISTS convites_escritorio_id_idx         ON public.convites(escritorio_id);

CREATE INDEX IF NOT EXISTS clientes_escritorio_id_idx         ON public.clientes(escritorio_id);
CREATE INDEX IF NOT EXISTS processos_escritorio_id_idx        ON public.processos(escritorio_id);
CREATE INDEX IF NOT EXISTS prazos_escritorio_id_idx           ON public.prazos(escritorio_id);
CREATE INDEX IF NOT EXISTS honorarios_escritorio_id_idx       ON public.honorarios(escritorio_id);
CREATE INDEX IF NOT EXISTS despesas_escritorio_id_idx         ON public.despesas(escritorio_id);
CREATE INDEX IF NOT EXISTS tarefas_escritorio_id_idx          ON public.tarefas(escritorio_id);
CREATE INDEX IF NOT EXISTS tarefas_atribuido_a_idx            ON public.tarefas(atribuido_a);
CREATE INDEX IF NOT EXISTS reg_horas_escritorio_id_idx        ON public.registros_horas(escritorio_id);
CREATE INDEX IF NOT EXISTS andamentos_escritorio_id_idx       ON public.andamentos_processuais(escritorio_id);
