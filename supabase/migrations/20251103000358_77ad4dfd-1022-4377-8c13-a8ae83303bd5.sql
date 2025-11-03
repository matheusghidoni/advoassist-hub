-- Add foreign key constraints explicitly with named constraints

-- Foreign key from processos to clientes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'processos_cliente_id_fkey' 
    AND table_name = 'processos'
  ) THEN
    ALTER TABLE public.processos
    ADD CONSTRAINT processos_cliente_id_fkey 
    FOREIGN KEY (cliente_id) 
    REFERENCES public.clientes(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Foreign key from honorarios to processos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'honorarios_processo_id_fkey' 
    AND table_name = 'honorarios'
  ) THEN
    ALTER TABLE public.honorarios
    ADD CONSTRAINT honorarios_processo_id_fkey 
    FOREIGN KEY (processo_id) 
    REFERENCES public.processos(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Foreign key from prazos to processos  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'prazos_processo_id_fkey' 
    AND table_name = 'prazos'
  ) THEN
    ALTER TABLE public.prazos
    ADD CONSTRAINT prazos_processo_id_fkey 
    FOREIGN KEY (processo_id) 
    REFERENCES public.processos(id) 
    ON DELETE SET NULL;
  END IF;
END $$;