-- Número correlativo de pedido (histórico global)
CREATE SEQUENCE IF NOT EXISTS orders_numero_seq;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS numero INTEGER;

-- Backfill filas existentes con números secuenciales por fecha de creación
UPDATE orders
SET numero = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM orders
) sub
WHERE orders.id = sub.id;

-- Fijar la secuencia al máximo actual para que los próximos sigan desde ahí
SELECT setval('orders_numero_seq', COALESCE((SELECT MAX(numero) FROM orders), 0) + 1);

-- Default para nuevas filas
ALTER TABLE orders ALTER COLUMN numero SET DEFAULT nextval('orders_numero_seq');
