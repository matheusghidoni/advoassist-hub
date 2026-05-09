-- ── whatsapp_instances ────────────────────────────────────────────────────────
--
-- Armazena uma sessão WhatsApp por escritório.
-- A Evolution API gerencia a conexão real; esta tabela espelha o estado
-- e guarda o QR code temporário durante o pareamento.

CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id   uuid        NOT NULL UNIQUE
                              REFERENCES public.escritorios(id) ON DELETE CASCADE,
  instance_name   text        NOT NULL UNIQUE,
  status          text        NOT NULL DEFAULT 'disconnected'
                              CHECK (status IN (
                                'disconnected','connecting','connected','qr_pending','error'
                              )),
  phone_number    text,
  qr_code         text,
  qr_expires_at   timestamptz,
  webhook_secret  text        NOT NULL DEFAULT gen_random_uuid()::text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Trigger: updated_at ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_whatsapp_instances_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_whatsapp_instances_updated_at ON public.whatsapp_instances;
CREATE TRIGGER set_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_instances_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esc_sel_whatsapp_instances" ON public.whatsapp_instances FOR SELECT
  USING (escritorio_id = ANY(public.membro_escritorios()));

CREATE POLICY "esc_ins_whatsapp_instances" ON public.whatsapp_instances FOR INSERT
  WITH CHECK (escritorio_id = ANY(public.membro_escritorios()));

CREATE POLICY "esc_upd_whatsapp_instances" ON public.whatsapp_instances FOR UPDATE
  USING (escritorio_id = ANY(public.membro_escritorios()));

CREATE POLICY "esc_del_whatsapp_instances" ON public.whatsapp_instances FOR DELETE
  USING (escritorio_id = ANY(public.membro_escritorios()));

-- ── Índices ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS whatsapp_instances_escritorio_id_idx
  ON public.whatsapp_instances(escritorio_id);

-- ── Extensão da tabela comunicacoes ──────────────────────────────────────────
--
-- Adiciona rastreamento de ID e status de mensagens WhatsApp enviadas
-- via Evolution API, aproveitando a tabela já existente.

ALTER TABLE public.comunicacoes
  ADD COLUMN IF NOT EXISTS whatsapp_message_id text,
  ADD COLUMN IF NOT EXISTS whatsapp_status      text
    CHECK (
      whatsapp_status IS NULL
      OR whatsapp_status IN ('sent', 'delivered', 'read', 'failed')
    );

CREATE INDEX IF NOT EXISTS comunicacoes_whatsapp_msg_id_idx
  ON public.comunicacoes(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;
