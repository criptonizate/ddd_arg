-- Agregar costo_kg a filamentos
ALTER TABLE filamentos ADD COLUMN IF NOT EXISTS costo_kg numeric NOT NULL DEFAULT 0;

-- Tabla de ventas de filamento
CREATE TABLE IF NOT EXISTS filamento_ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filamento_id uuid NOT NULL REFERENCES filamentos(id) ON DELETE CASCADE,
  gramos numeric NOT NULL CHECK (gramos > 0),
  precio_kg numeric NOT NULL DEFAULT 0,
  costo_kg numeric NOT NULL DEFAULT 0,
  cliente text NOT NULL DEFAULT '',
  nota text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE filamento_ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON filamento_ventas USING (true) WITH CHECK (true);
