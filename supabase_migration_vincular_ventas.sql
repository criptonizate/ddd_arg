-- Agregar user_id a filamento_ventas para vincular ventas históricas a usuarios registrados
ALTER TABLE filamento_ventas
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_filventas_user ON filamento_ventas(user_id);
