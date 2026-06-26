-- Tabla de stock de filamentos
CREATE TABLE IF NOT EXISTS filamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  material text NOT NULL DEFAULT 'PLA'
    CHECK (material IN ('PLA', 'PETG', 'TPU', 'ABS', 'ASA', 'Otro')),
  color text NOT NULL DEFAULT '',
  rollos_cerrados integer NOT NULL DEFAULT 0 CHECK (rollos_cerrados >= 0),
  gramos_sueltos numeric NOT NULL DEFAULT 0 CHECK (gramos_sueltos >= 0),
  peso_rollo_gr numeric NOT NULL DEFAULT 1000 CHECK (peso_rollo_gr > 0),
  nota text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Historial de movimientos (compras de filamento)
CREATE TABLE IF NOT EXISTS filamento_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filamento_id uuid NOT NULL REFERENCES filamentos(id) ON DELETE CASCADE,
  rollos integer NOT NULL DEFAULT 0 CHECK (rollos >= 0),
  gramos numeric NOT NULL DEFAULT 0 CHECK (gramos >= 0),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  nota text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_filamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS filamentos_updated_at ON filamentos;
CREATE TRIGGER filamentos_updated_at
  BEFORE UPDATE ON filamentos
  FOR EACH ROW EXECUTE FUNCTION update_filamentos_updated_at();
