-- Tracking de recordatorios de vencimiento enviados, para dedup del cron.
-- Garantiza que no mandamos 2 veces el mismo email al mismo cliente por el mismo período.

CREATE TABLE IF NOT EXISTS membresia_recordatorios (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  periodo_fin date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('7d', '2d')),
  enviado_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, periodo_fin, tipo)
);

-- No necesita RLS — es tabla interna que solo el service role toca desde el cron.
