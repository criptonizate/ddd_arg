-- Módulo mayorista: negocios a los que se entrega stock

CREATE TABLE negocios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  contacto   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cada pedido que un negocio hace para restock
CREATE TABLE negocio_pedidos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  fecha      DATE NOT NULL DEFAULT CURRENT_DATE,
  nota       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Items dentro de cada pedido
CREATE TABLE negocio_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id        UUID NOT NULL REFERENCES negocio_pedidos(id) ON DELETE CASCADE,
  nombre_producto  TEXT NOT NULL,
  precio_mayorista NUMERIC(12,2) NOT NULL CHECK (precio_mayorista >= 0),
  cantidad         INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0)
);
