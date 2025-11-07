-- Add office data fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS office_name TEXT,
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS office_address TEXT;