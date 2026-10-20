CREATE TABLE IF NOT EXISTS filamento_carrito (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);
