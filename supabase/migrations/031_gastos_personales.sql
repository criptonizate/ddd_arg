CREATE TABLE IF NOT EXISTS gastos_personales (
  id         TEXT PRIMARY KEY,
  concept    TEXT        NOT NULL,
  type       TEXT        NOT NULL CHECK (type IN ('gasto', 'ingreso')),
  category   TEXT        NOT NULL CHECK (category IN ('fijo', 'variable')),
  amount     NUMERIC     NOT NULL,
  date       DATE        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pagado', 'pendiente')),
  due        DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
