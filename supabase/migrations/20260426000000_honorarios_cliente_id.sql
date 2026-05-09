-- Permite vincular um honorário diretamente a um cliente,
-- sem necessidade de processo cadastrado.
ALTER TABLE honorarios
  ADD COLUMN IF NOT EXISTS cliente_id uuid
    REFERENCES clientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_honorarios_cliente_id ON honorarios(cliente_id);
