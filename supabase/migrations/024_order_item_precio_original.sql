-- Permite guardar el precio base original cuando se aplica un descuento
-- precio_unitario = precio final cobrado
-- precio_original = precio de lista (null si no hubo descuento)

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS precio_original numeric(12,2) DEFAULT NULL;
