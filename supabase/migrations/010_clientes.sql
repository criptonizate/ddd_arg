-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  telefono    TEXT,
  email       TEXT,
  direccion   TEXT,
  notas       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsqueda por nombre (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes (LOWER(nombre));

-- Relación orders → clientes (nullable: pedidos viejos no tienen cliente_id)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_cliente_id ON orders (cliente_id);
