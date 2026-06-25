-- Configuración persistente de la calculadora de costos de impresión 3D

CREATE TABLE IF NOT EXISTS calculadora_config (
  id              integer PRIMARY KEY DEFAULT 1,
  precio_filamento_kg  numeric NOT NULL DEFAULT 20000,
  precio_kwh           numeric NOT NULL DEFAULT 140,
  consumo_w            numeric NOT NULL DEFAULT 120,
  vida_util_horas      numeric NOT NULL DEFAULT 4320,
  costo_repuestos      numeric NOT NULL DEFAULT 150000,
  margen_error_pct     numeric NOT NULL DEFAULT 15,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO calculadora_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
