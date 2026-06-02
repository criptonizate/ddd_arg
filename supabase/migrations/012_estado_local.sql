-- Agregar estado 'local' para ventas realizadas en el local físico
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_estado_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_estado_check
  CHECK (estado IN ('pendiente', 'confirmada', 'listo', 'entregada', 'cancelada', 'local'));
