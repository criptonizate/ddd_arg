ALTER TABLE filamento_ventas
  ADD COLUMN IF NOT EXISTS pedido_id uuid REFERENCES filamento_pedidos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS filamento_ventas_pedido_id_idx ON filamento_ventas(pedido_id);
