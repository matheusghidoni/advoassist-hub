-- Criar bucket para documentos de clientes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-documents', 'client-documents', false);

-- Criar tabela para rastrear documentos
CREATE TABLE public.cliente_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nome_arquivo TEXT NOT NULL,
  caminho_storage TEXT NOT NULL,
  tamanho_bytes BIGINT,
  tipo_mime TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cliente_documentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cliente_documentos
CREATE POLICY "Users can view their own client documents"
ON public.cliente_documentos
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own client documents"
ON public.cliente_documentos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client documents"
ON public.cliente_documentos
FOR DELETE
USING (auth.uid() = user_id);

-- Políticas de storage para o bucket
CREATE POLICY "Users can upload their own client documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own client documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own client documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);