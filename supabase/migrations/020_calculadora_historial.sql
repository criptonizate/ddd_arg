-- Historial de cálculos de la calculadora 3D

CREATE TABLE IF NOT EXISTS calculadora_historial (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_pieza     text NOT NULL DEFAULT '',
  horas            numeric NOT NULL DEFAULT 0,
  minutos          numeric NOT NULL DEFAULT 0,
  gramos           numeric NOT NULL DEFAULT 0,
  insumos          numeric NOT NULL DEFAULT 0,
  multiplicador    numeric NOT NULL DEFAULT 3,
  resultado_total  numeric NOT NULL DEFAULT 0,
  resultado_ml     numeric NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calculadora_historial_created_at ON calculadora_historial(created_at DESC);
