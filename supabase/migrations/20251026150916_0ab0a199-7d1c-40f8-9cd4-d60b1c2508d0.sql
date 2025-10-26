-- Create honorarios table
CREATE TABLE public.honorarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  processo_id UUID REFERENCES public.processos(id) ON DELETE CASCADE,
  valor_total NUMERIC NOT NULL,
  valor_pago NUMERIC NOT NULL DEFAULT 0,
  data_vencimento DATE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'parcial', 'pago')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.honorarios ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own honorarios"
  ON public.honorarios
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own honorarios"
  ON public.honorarios
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own honorarios"
  ON public.honorarios
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own honorarios"
  ON public.honorarios
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_honorarios_updated_at
  BEFORE UPDATE ON public.honorarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();