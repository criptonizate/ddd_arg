-- Tabla de insumos (suministros: adhesivos, superficies, herramientas, etc.)
CREATE TABLE IF NOT EXISTS insumos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text,
  categoria text NOT NULL DEFAULT 'General',
  precio_unitario integer NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  imagen_url text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de pedidos de insumos
CREATE TABLE IF NOT EXISTS insumo_pedidos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero serial NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cliente_nombre text NOT NULL,
  cliente_telefono text,
  items jsonb NOT NULL DEFAULT '[]',
  total integer NOT NULL DEFAULT 0,
  descuento_pct integer NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'confirmado', 'cancelado', 'entregado')),
  nota text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insumo_pedidos_estado ON insumo_pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_insumo_pedidos_user_id ON insumo_pedidos(user_id);
