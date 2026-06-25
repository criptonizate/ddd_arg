-- Estado 'imprimiendo' entre confirmada y listo
-- + tabla de log de eventos por pedido

-- Ampliar CHECK constraint de orders.estado
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_estado_check;
ALTER TABLE orders ADD CONSTRAINT orders_estado_check
  CHECK (estado IN ('pendiente', 'confirmada', 'imprimiendo', 'listo', 'entregada', 'cancelada', 'local'));

-- Log de eventos / notas por pedido
CREATE TABLE IF NOT EXISTS order_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tipo        text NOT NULL DEFAULT 'nota',
  descripcion text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON order_events(created_at DESC);
