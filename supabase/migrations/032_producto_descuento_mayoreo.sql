ALTER TABLE products
  ADD COLUMN IF NOT EXISTS descuento_mayoreo_pct NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (descuento_mayoreo_pct >= 0 AND descuento_mayoreo_pct < 100);
