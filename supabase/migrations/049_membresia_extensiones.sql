CREATE TABLE IF NOT EXISTS membresia_extensiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dias integer NOT NULL DEFAULT 15,
  costo integer NOT NULL DEFAULT 5000,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'rechazado')),
  nota text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmado_at timestamptz
);

ALTER TABLE membresia_extensiones ENABLE ROW LEVEL SECURITY;

-- El cliente puede ver sus propias extensiones y crear nuevas
CREATE POLICY "ext_select_own" ON membresia_extensiones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ext_insert_own" ON membresia_extensiones FOR INSERT WITH CHECK (auth.uid() = user_id);
