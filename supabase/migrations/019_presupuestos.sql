-- Presupuestos guardados en BD

CREATE TABLE IF NOT EXISTS presupuestos (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nombre          text NOT NULL DEFAULT '',
  cliente_direccion       text NOT NULL DEFAULT '',
  cliente_cuit            text NOT NULL DEFAULT '',
  cliente_telefono        text NOT NULL DEFAULT '',
  cliente_email           text NOT NULL DEFAULT '',
  items                   jsonb NOT NULL DEFAULT '[]',
  descuento_mayorista_pct numeric NOT NULL DEFAULT 0,
  nota                    text NOT NULL DEFAULT '',
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_presupuestos_created_at ON presupuestos(created_at DESC);
