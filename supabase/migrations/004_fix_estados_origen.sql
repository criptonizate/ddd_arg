-- Alinear estados de orders con el código TypeScript
UPDATE orders SET estado = 'confirmada' WHERE estado = 'confirmado';
UPDATE orders SET estado = 'entregada'  WHERE estado = 'entregado';
UPDATE orders SET estado = 'cancelada'  WHERE estado = 'cancelado';

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_estado_check;
ALTER TABLE orders ADD CONSTRAINT orders_estado_check
  CHECK (estado IN ('pendiente', 'confirmada', 'listo', 'entregada', 'cancelada'));

-- Alinear origen: la tienda web usaba 'web' pero la constraint solo acepta 'tienda'
UPDATE orders SET origen = 'tienda' WHERE origen = 'web';

-- Actualizar RPC confirmar_pedido para usar 'confirmada'
CREATE OR REPLACE FUNCTION confirmar_pedido(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item   record;
  v_total  numeric(12,2);
  v_nombre text;
BEGIN
  SELECT total, cliente_nombre INTO v_total, v_nombre
  FROM orders WHERE id = p_order_id AND estado = 'pendiente';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado o no está en estado pendiente';
  END IF;

  FOR v_item IN
    SELECT oi.variant_id, oi.cantidad, oi.nombre_variante
    FROM order_items oi WHERE oi.order_id = p_order_id AND oi.variant_id IS NOT NULL
  LOOP
    UPDATE product_variants SET stock = stock - v_item.cantidad
    WHERE id = v_item.variant_id AND stock >= v_item.cantidad;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuficiente para "%"', v_item.nombre_variante;
    END IF;
  END LOOP;

  UPDATE orders SET estado = 'confirmada', updated_at = now() WHERE id = p_order_id;

  INSERT INTO transactions (tipo, monto, descripcion, categoria, order_id)
  VALUES ('ingreso', v_total, 'Pedido confirmado: ' || COALESCE(v_nombre, 'Sin nombre'), 'venta', p_order_id);
END;
$$;

-- Actualizar RPC cancelar_pedido para usar 'confirmada'
CREATE OR REPLACE FUNCTION cancelar_pedido(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_estado text;
  v_item   record;
BEGIN
  SELECT estado INTO v_estado FROM orders WHERE id = p_order_id;
  IF v_estado IS NULL THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;
  IF v_estado = 'cancelada' THEN RAISE EXCEPTION 'El pedido ya está cancelado'; END IF;

  IF v_estado IN ('confirmada', 'listo') THEN
    FOR v_item IN
      SELECT oi.variant_id, oi.cantidad FROM order_items oi
      WHERE oi.order_id = p_order_id AND oi.variant_id IS NOT NULL
    LOOP
      UPDATE product_variants SET stock = stock + v_item.cantidad WHERE id = v_item.variant_id;
    END LOOP;
    DELETE FROM transactions WHERE order_id = p_order_id AND tipo = 'ingreso';
  END IF;

  UPDATE orders SET estado = 'cancelada', updated_at = now() WHERE id = p_order_id;
END;
$$;
