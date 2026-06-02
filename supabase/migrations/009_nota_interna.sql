-- Nota interna en pedidos (solo visible en admin, no para el cliente)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS nota_interna TEXT;
