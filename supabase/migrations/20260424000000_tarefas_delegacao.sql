-- ─────────────────────────────────────────────────────────────────────────────
-- Delegação de tarefas entre membros da equipe + notificação automática
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Adicionar coluna delegado_a
ALTER TABLE public.tarefas
  ADD COLUMN IF NOT EXISTS delegado_a uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. FK para public.profiles (necessário para join via PostgREST)
ALTER TABLE public.tarefas
  ADD CONSTRAINT tarefas_delegado_a_profiles_fkey
  FOREIGN KEY (delegado_a) REFERENCES public.profiles(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.tarefas
  VALIDATE CONSTRAINT tarefas_delegado_a_profiles_fkey;

-- 3. Índice para consultas por delegado_a
CREATE INDEX IF NOT EXISTS idx_tarefas_delegado_a ON public.tarefas(delegado_a);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Função + trigger: notificar o usuário ao receber uma tarefa delegada
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notificar_delegacao_tarefa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo_tarefa text;
  v_delegante     text;
BEGIN
  -- Disparar apenas quando delegado_a foi definido (INSERT com valor ou UPDATE que mudou)
  IF NEW.delegado_a IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ignorar se não mudou (UPDATE sem alteração)
  IF TG_OP = 'UPDATE' AND OLD.delegado_a IS NOT DISTINCT FROM NEW.delegado_a THEN
    RETURN NEW;
  END IF;

  -- Não notificar se a pessoa está delegando para si mesma
  IF NEW.delegado_a = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Buscar nome do delegante
  SELECT COALESCE(full_name, 'Alguém') INTO v_delegante
  FROM public.profiles
  WHERE id = NEW.user_id;

  INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, lida, link)
  VALUES (
    NEW.delegado_a,
    'Nova tarefa delegada para você',
    v_delegante || ' delegou a tarefa "' || NEW.titulo || '" para você.',
    'tarefa',
    false,
    '/tarefas'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_delegacao ON public.tarefas;

CREATE TRIGGER trg_notificar_delegacao
  AFTER INSERT OR UPDATE OF delegado_a ON public.tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_delegacao_tarefa();
