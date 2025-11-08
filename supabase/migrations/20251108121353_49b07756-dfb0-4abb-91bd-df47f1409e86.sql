-- Add payment type and installments fields to honorarios table
ALTER TABLE public.honorarios 
ADD COLUMN IF NOT EXISTS tipo_pagamento TEXT NOT NULL DEFAULT 'a_vista',
ADD COLUMN IF NOT EXISTS numero_parcelas INTEGER;