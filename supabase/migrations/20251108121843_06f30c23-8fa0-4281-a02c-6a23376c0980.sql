-- Add valor_entrada field to honorarios table
ALTER TABLE public.honorarios 
ADD COLUMN IF NOT EXISTS valor_entrada NUMERIC NOT NULL DEFAULT 0;