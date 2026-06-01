-- Agregar fecha de entrega/egreso a los pedidos de negocios
ALTER TABLE negocio_pedidos ADD COLUMN entregado_at TIMESTAMPTZ;
