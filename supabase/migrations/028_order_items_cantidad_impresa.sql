ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cantidad_impresa integer NOT NULL DEFAULT 0;

-- Retrocompatibilidad: si un item ya estaba marcado como impreso, poner cantidad_impresa = cantidad
UPDATE order_items SET cantidad_impresa = cantidad WHERE impreso = true;
