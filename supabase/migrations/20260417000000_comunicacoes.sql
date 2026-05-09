-- ── Tabela: comunicacoes ──────────────────────────────────────────────────────
--
-- Registro de todas as interações com clientes e/ou processos:
-- ligações telefônicas, e-mails, reuniões, WhatsApp, etc.

CREATE TABLE IF NOT EXISTS public.comunicacoes (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escritorio_id      uuid        REFERENCES public.escritorios(id) ON DELETE CASCADE,
  cliente_id         uuid        REFERENCES public.clientes(id) ON DELETE SET NULL,
  processo_id        uuid        REFERENCES public.processos(id) ON DELETE SET NULL,

  tipo               text        NOT NULL DEFAULT 'outro'
                                 CHECK (tipo IN ('ligacao','email','reuniao','whatsapp','outro')),
  direcao            text        NOT NULL DEFAULT 'saida'
                                 CHECK (direcao IN ('entrada','saida')),

  assunto            text        NOT NULL,
  descricao          text,
  data               date        NOT NULL DEFAULT CURRENT_DATE,
  hora               time,
  duracao_minutos    integer     CHECK (duracao_minutos > 0),

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── Trigger updated_at ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_comunicacoes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_comunicacoes_updated_at ON public.comunicacoes;
CREATE TRIGGER set_comunicacoes_updated_at
  BEFORE UPDATE ON public.comunicacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_comunicacoes_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.comunicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esc_sel_comunicacoes" ON public.comunicacoes FOR SELECT
  USING (
    escritorio_id = ANY(public.membro_escritorios())
    OR user_id = auth.uid()
  );

CREATE POLICY "esc_ins_comunicacoes" ON public.comunicacoes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      escritorio_id IS NULL
      OR escritorio_id = ANY(public.membro_escritorios())
    )
  );

CREATE POLICY "esc_upd_comunicacoes" ON public.comunicacoes FOR UPDATE
  USING (
    escritorio_id = ANY(public.membro_escritorios())
    OR user_id = auth.uid()
  );

CREATE POLICY "esc_del_comunicacoes" ON public.comunicacoes FOR DELETE
  USING (user_id = auth.uid());

-- ── Índices ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS comunicacoes_escritorio_id_idx ON public.comunicacoes(escritorio_id);
CREATE INDEX IF NOT EXISTS comunicacoes_cliente_id_idx    ON public.comunicacoes(cliente_id);
CREATE INDEX IF NOT EXISTS comunicacoes_processo_id_idx   ON public.comunicacoes(processo_id);
CREATE INDEX IF NOT EXISTS comunicacoes_user_id_idx       ON public.comunicacoes(user_id);
CREATE INDEX IF NOT EXISTS comunicacoes_data_idx          ON public.comunicacoes(data DESC);
CREATE INDEX IF NOT EXISTS comunicacoes_tipo_idx          ON public.comunicacoes(tipo);
