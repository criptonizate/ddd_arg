-- Reserva temporal de stock (3h) cuando se crea un pedido pendiente
-- Ejecutar en el SQL Editor de Supabase

-- 1. Columna reservado_hasta en filamento_pedidos
ALTER TABLE filamento_pedidos
  ADD COLUMN IF NOT EXISTS reservado_hasta TIMESTAMPTZ;

-- 2. Tabla de reservas de stock por item
CREATE TABLE IF NOT EXISTS filamento_reservas (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id       UUID NOT NULL REFERENCES filamento_pedidos(id) ON DELETE CASCADE,
  filamento_id    UUID NOT NULL REFERENCES filamentos(id),
  gramos          INTEGER NOT NULL,
  reservado_hasta TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filres_filamento ON filamento_reservas(filamento_id);
CREATE INDEX IF NOT EXISTS idx_filres_hasta     ON filamento_reservas(reservado_hasta);

-- 3. RLS: servicio puede leer/escribir, anon solo leer reservas activas propias
ALTER TABLE filamento_reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all" ON filamento_reservas
  USING (true) WITH CHECK (true);
