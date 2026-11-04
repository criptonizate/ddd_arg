-- ─────────────────────────────────────────────────────────────────────────────
-- 070_crear_pedido_tienda_atomico.sql
--
-- RPC `crear_pedido_tienda_atomico`: inserta orders + order_items y descuenta
-- stock de product_variants en UNA transacción con FOR UPDATE por variante.
--
-- Antes: SELECT variant → INSERT orders → INSERT items → UPDATE stock cada
-- uno por su lado. Dos clientes comprando la última unidad al mismo tiempo
-- pasaban ambos (TOCTOU) y quedaba stock negativo.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION crear_pedido_tienda_atomico(
  p_order        JSONB,
  p_items        JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id      UUID;
  v_item          JSONB;
  v_variant_id    UUID;
  v_cantidad      INTEGER;
  v_precio        NUMERIC;
  v_stock_actual  INTEGER;
  v_total         NUMERIC := 0;
BEGIN
  -- Primera pasada: FOR UPDATE + validar stock + calcular total real
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_cantidad   := (v_item->>'cantidad')::INTEGER;

    IF v_cantidad IS NULL OR v_cantidad <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida';
    END IF;

    SELECT stock, precio INTO v_stock_actual, v_precio
      FROM product_variants
     WHERE id = v_variant_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variante % no encontrada', v_variant_id;
    END IF;

    IF v_stock_actual < v_cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente para variante %', v_variant_id;
    END IF;

    v_total := v_total + (v_precio * v_cantidad);
  END LOOP;

  -- Insert del order con el total recalculado (ignoramos cualquier total que
  -- venga del cliente — el server es la autoridad)
  INSERT INTO orders (
    cliente_nombre, cliente_telefono, cliente_email, direccion, notas,
    total, origen, estado, metodo_pago
  ) VALUES (
    p_order->>'cliente_nombre',
    p_order->>'cliente_telefono',
    p_order->>'cliente_email',
    p_order->>'direccion',
    p_order->>'notas',
    v_total,
    'tienda',
    'pendiente',
    'whatsapp'
  )
  RETURNING id INTO v_order_id;

  -- Segunda pasada: insertar items y descontar stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_cantidad   := (v_item->>'cantidad')::INTEGER;

    SELECT precio INTO v_precio FROM product_variants WHERE id = v_variant_id;

    INSERT INTO order_items (order_id, product_id, variant_id, cantidad, precio_unitario)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      v_variant_id,
      v_cantidad,
      v_precio
    );

    UPDATE product_variants
       SET stock = stock - v_cantidad
     WHERE id = v_variant_id;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'id', v_order_id, 'total', v_total);
END;
$$;
