-- ─────────────────────────────────────────────────────────────────────────────
-- Notificações automáticas de andamento de tarefas
--
-- Dispara notificação para as partes envolvidas sempre que o status de uma
-- tarefa muda. As regras de notificação são:
--
--  pendente → em_andamento : notifica o criador da tarefa
--  * → concluida           : notifica o criador + delegado_a (se houver)
--  * → cancelada           : notifica o criador + delegado_a (se houver)
--
-- Nunca envia notificação para quem a tarefa pertence se for o mesmo usuário
-- que está vendo a mudança (self-notification é suprimida pelo trigger
-- verificando se user_id != delegado_a).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notificar_andamento_tarefa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escritorio_nome text;
  v_msg_criador     text;
  v_msg_delegado    text;
  v_tipo            text := 'tarefa';
BEGIN
  -- Só dispara se o status realmente mudou
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Buscar nome do escritório para contexto
  SELECT e.nome INTO v_escritorio_nome
  FROM public.escritorios e
  WHERE e.id = NEW.escritorio_id;

  -- ── Definir mensagens por transição ────────────────────────────────────────

  IF NEW.status = 'em_andamento' AND OLD.status = 'pendente' THEN
    v_msg_criador  := 'A tarefa "' || NEW.titulo || '" foi iniciada (' || COALESCE(v_escritorio_nome, 'escritório') || ').';
    v_msg_delegado := 'A tarefa "' || NEW.titulo || '" que está sob sua responsabilidade foi iniciada.';

  ELSIF NEW.status = 'concluida' THEN
    v_msg_criador  := 'A tarefa "' || NEW.titulo || '" foi concluída (' || COALESCE(v_escritorio_nome, 'escritório') || ').';
    v_msg_delegado := 'A tarefa "' || NEW.titulo || '" que estava sob sua responsabilidade foi concluída.';
    v_tipo         := 'sucesso';

  ELSIF NEW.status = 'cancelada' THEN
    v_msg_criador  := 'A tarefa "' || NEW.titulo || '" foi cancelada (' || COALESCE(v_escritorio_nome, 'escritório') || ').';
    v_msg_delegado := 'A tarefa "' || NEW.titulo || '" que estava sob sua responsabilidade foi cancelada.';
    v_tipo         := 'aviso';

  ELSE
    -- Outros status não geram notificação
    RETURN NEW;
  END IF;

  -- ── Notificar o criador da tarefa ───────────────────────────────────────────
  -- (apenas se não for o próprio delegado — evita duplicata)
  IF NEW.delegado_a IS NULL OR NEW.delegado_a != NEW.user_id THEN
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, lida, link)
    VALUES (
      NEW.user_id,
      CASE NEW.status
        WHEN 'em_andamento' THEN 'Tarefa iniciada'
        WHEN 'concluida'    THEN 'Tarefa concluída ✓'
        WHEN 'cancelada'    THEN 'Tarefa cancelada'
      END,
      v_msg_criador,
      v_tipo,
      false,
      '/tarefas'
    );
  END IF;

  -- ── Notificar o responsável delegado (se diferente do criador) ──────────────
  IF NEW.delegado_a IS NOT NULL AND NEW.delegado_a != NEW.user_id THEN
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, lida, link)
    VALUES (
      NEW.delegado_a,
      CASE NEW.status
        WHEN 'em_andamento' THEN 'Tarefa iniciada'
        WHEN 'concluida'    THEN 'Tarefa concluída ✓'
        WHEN 'cancelada'    THEN 'Tarefa cancelada'
      END,
      v_msg_delegado,
      v_tipo,
      false,
      '/tarefas'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_andamento ON public.tarefas;

CREATE TRIGGER trg_notificar_andamento
  AFTER UPDATE OF status ON public.tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_andamento_tarefa();
