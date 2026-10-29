-- Pedir colores de filamento desde /cuenta
-- Extiende filamento_sugerencias con campos para "pedí un color" + flujo de notificación

ALTER TABLE filamento_sugerencias
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'notificado', 'descartado')),
  ADD COLUMN IF NOT EXISTS respondido_at timestamptz,
  ADD COLUMN IF NOT EXISTS visto_por_cliente boolean NOT NULL DEFAULT false;

-- Index para consultas de cliente (sus sugerencias en orden)
CREATE INDEX IF NOT EXISTS idx_sugerencias_user_created
  ON filamento_sugerencias(user_id, created_at DESC);

-- Index para admin: pendientes primero
CREATE INDEX IF NOT EXISTS idx_sugerencias_estado
  ON filamento_sugerencias(estado, created_at DESC);
