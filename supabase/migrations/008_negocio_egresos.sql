-- Egresos por negocio: vendido o devuelto, por nombre de producto
-- El stock se calcula como: SUM(items.cantidad) - SUM(egresos.cantidad) por producto

CREATE TABLE negocio_egresos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id      UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre_producto TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('vendido', 'devuelto')),
  cantidad        INTEGER NOT NULL CHECK (cantidad > 0),
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  nota            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
