-- Módulo de proveedores: contactos + historial de compras

CREATE TABLE IF NOT EXISTS proveedores (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    text NOT NULL,
  contacto  text NOT NULL DEFAULT '',
  email     text NOT NULL DEFAULT '',
  telefono  text NOT NULL DEFAULT '',
  nota      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proveedor_compras (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id uuid NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  descripcion  text NOT NULL,
  categoria    text NOT NULL DEFAULT 'filamento_insumos'
    CHECK (categoria IN ('filamento_insumos','electricidad','repuestos_impresora','envios','comisiones','otros')),
  monto        numeric NOT NULL CHECK (monto > 0),
  fecha        date NOT NULL DEFAULT CURRENT_DATE,
  nota         text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proveedor_compras_proveedor_id ON proveedor_compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_proveedor_compras_fecha ON proveedor_compras(fecha DESC);
