-- Vincular ventas de filamento a cuentas de usuario
ALTER TABLE filamento_ventas
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS filamento_ventas_user_id_idx ON filamento_ventas(user_id);
