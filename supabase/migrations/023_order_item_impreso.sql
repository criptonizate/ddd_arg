-- Permite marcar individualmente qué productos de un pedido ya están impresos
-- mientras el pedido está en estado 'imprimiendo'

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS impreso boolean NOT NULL DEFAULT false;
