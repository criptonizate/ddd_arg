CREATE TABLE IF NOT EXISTS filamento_alertas_stock (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filamento_id uuid NOT NULL REFERENCES filamentos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, filamento_id)
);

CREATE INDEX IF NOT EXISTS filamento_alertas_stock_filamento_id_idx ON filamento_alertas_stock(filamento_id);
CREATE INDEX IF NOT EXISTS filamento_alertas_stock_user_id_idx ON filamento_alertas_stock(user_id);
