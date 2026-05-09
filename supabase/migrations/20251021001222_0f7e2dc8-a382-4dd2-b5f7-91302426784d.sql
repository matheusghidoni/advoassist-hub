-- Create clientes table
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- RLS policies for clientes
CREATE POLICY "Users can view their own clientes"
ON public.clientes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clientes"
ON public.clientes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clientes"
ON public.clientes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clientes"
ON public.clientes FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for clientes updated_at
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create processos table
CREATE TABLE public.processos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  valor DECIMAL(10, 2),
  vara TEXT,
  comarca TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for processos
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

-- RLS policies for processos
CREATE POLICY "Users can view their own processos"
ON public.processos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processos"
ON public.processos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processos"
ON public.processos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processos"
ON public.processos FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for processos updated_at
CREATE TRIGGER update_processos_updated_at
BEFORE UPDATE ON public.processos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create prazos table
CREATE TABLE public.prazos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  processo_id UUID REFERENCES public.processos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL,
  tipo TEXT NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'media',
  concluido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for prazos
ALTER TABLE public.prazos ENABLE ROW LEVEL SECURITY;

-- RLS policies for prazos
CREATE POLICY "Users can view their own prazos"
ON public.prazos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prazos"
ON public.prazos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prazos"
ON public.prazos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prazos"
ON public.prazos FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for prazos updated_at
CREATE TRIGGER update_prazos_updated_at
BEFORE UPDATE ON public.prazos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();