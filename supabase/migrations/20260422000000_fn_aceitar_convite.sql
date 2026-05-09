-- Função SECURITY DEFINER para aceitar convite por token.
-- Roda com privilégios de superusuário, contornando RLS de forma segura.
-- Toda a validação é feita dentro da função.

CREATE OR REPLACE FUNCTION public.aceitar_convite_por_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_convite  public.convites%ROWTYPE;
  v_user_id  uuid := auth.uid();
  v_membro   public.escritorio_membros%ROWTYPE;
BEGIN
  -- 1. Validar usuário autenticado
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- 2. Buscar convite válido pelo token
  SELECT * INTO v_convite
  FROM public.convites
  WHERE token = p_token
    AND aceito_em IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired');
  END IF;

  -- 3. Upsert na escritorio_membros (cria ou reativa)
  INSERT INTO public.escritorio_membros (escritorio_id, user_id, role, status)
  VALUES (v_convite.escritorio_id, v_user_id, v_convite.role, 'ativo')
  ON CONFLICT (escritorio_id, user_id)
  DO UPDATE SET
    status = 'ativo',
    role   = EXCLUDED.role;

  -- 4. Marcar convite como aceito
  UPDATE public.convites
  SET aceito_em = now()
  WHERE id = v_convite.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Garantir que qualquer usuário autenticado possa chamar a função
GRANT EXECUTE ON FUNCTION public.aceitar_convite_por_token(text) TO authenticated;
