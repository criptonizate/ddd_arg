-- Campo para ocultar filamentos del listado público
ALTER TABLE filamentos ADD COLUMN IF NOT EXISTS oculto boolean NOT NULL DEFAULT false;

-- Sugerencias de filamentos enviadas por clientes
CREATE TABLE IF NOT EXISTS filamento_sugerencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre_usuario text NOT NULL DEFAULT '',
  mensaje text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  leido boolean NOT NULL DEFAULT false
);

ALTER TABLE filamento_sugerencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sugerencias_insert_auth" ON filamento_sugerencias
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sugerencias_select_own" ON filamento_sugerencias
  FOR SELECT USING (auth.uid() = user_id);
