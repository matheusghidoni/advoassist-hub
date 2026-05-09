-- Adicionar coluna de status aos clientes
ALTER TABLE public.clientes 
ADD COLUMN status TEXT NOT NULL DEFAULT 'ativo';

-- Adicionar check constraint para garantir valores válidos
ALTER TABLE public.clientes
ADD CONSTRAINT clientes_status_check 
CHECK (status IN ('ativo', 'encerrado'));