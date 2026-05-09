-- Add tipo column to clientes table
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'requerente' CHECK (tipo IN ('requerente', 'requerido', 'exequente', 'executado'));