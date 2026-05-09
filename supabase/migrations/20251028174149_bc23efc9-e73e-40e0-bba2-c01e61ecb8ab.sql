-- Criar enum para roles de usuário (se não existir)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar tabela de roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar função para verificar roles (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Drop policies se existirem e recriar
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Adicionar foreign keys que faltam (ignorar se já existirem)
DO $$ 
BEGIN
  ALTER TABLE public.processos
    ADD CONSTRAINT fk_processos_cliente
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
  ALTER TABLE public.honorarios
    ADD CONSTRAINT fk_honorarios_processo
    FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
  ALTER TABLE public.prazos
    ADD CONSTRAINT fk_prazos_processo
    FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Criar índices para performance (ignorar se já existirem)
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON public.clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);

CREATE INDEX IF NOT EXISTS idx_processos_user_id ON public.processos(user_id);
CREATE INDEX IF NOT EXISTS idx_processos_cliente_id ON public.processos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_processos_status ON public.processos(status);
CREATE INDEX IF NOT EXISTS idx_processos_numero ON public.processos(numero);

CREATE INDEX IF NOT EXISTS idx_honorarios_user_id ON public.honorarios(user_id);
CREATE INDEX IF NOT EXISTS idx_honorarios_processo_id ON public.honorarios(processo_id);
CREATE INDEX IF NOT EXISTS idx_honorarios_status ON public.honorarios(status);
CREATE INDEX IF NOT EXISTS idx_honorarios_data_vencimento ON public.honorarios(data_vencimento);

CREATE INDEX IF NOT EXISTS idx_prazos_user_id ON public.prazos(user_id);
CREATE INDEX IF NOT EXISTS idx_prazos_processo_id ON public.prazos(processo_id);
CREATE INDEX IF NOT EXISTS idx_prazos_data ON public.prazos(data);
CREATE INDEX IF NOT EXISTS idx_prazos_concluido ON public.prazos(concluido);

CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id ON public.notificacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON public.notificacoes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Adicionar validações (ignorar se já existirem)
DO $$ 
BEGIN
  ALTER TABLE public.honorarios
    ADD CONSTRAINT check_valor_total_positive CHECK (valor_total >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
  ALTER TABLE public.honorarios
    ADD CONSTRAINT check_valor_pago_positive CHECK (valor_pago >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
  ALTER TABLE public.honorarios
    ADD CONSTRAINT check_valor_pago_not_exceeds_total CHECK (valor_pago <= valor_total);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
  ALTER TABLE public.processos
    ADD CONSTRAINT check_valor_positive CHECK (valor IS NULL OR valor >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Trigger para criar role 'user' automaticamente quando um usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();