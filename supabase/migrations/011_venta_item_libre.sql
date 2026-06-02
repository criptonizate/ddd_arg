-- Reescribir crear_venta_manual para soportar ítems libres (sin product_id/variant_id)
-- y con la firma jsonb que usa el código TypeScript actual.
CREATE OR REPLACE FUNCTION crear_venta_manual(
  p_order  jsonb,
  p_items  jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id    uuid;
  v_total       numeric(12,2);
  v_item        jsonb;
  v_nombre_prod text;
  v_nombre_var  text;
  v_product_id  uuid;
  v_variant_id  uuid;
BEGIN
  -- Calcular total
  SELECT COALESCE(SUM((elem->>'precio_unitario')::numeric * (elem->>'cantidad')::int), 0)
  INTO v_total
  FROM jsonb_array_elements(p_items) elem;

  -- Crear pedido
  INSERT INTO orders (
    estado, origen, metodo_pago,
    cliente_nombre, cliente_telefono, cliente_email,
    entrega, direccion_envio, nota, total
  )
  VALUES (
    COALESCE(p_order->>'estado', 'confirmada'),
    COALESCE(p_order->>'origen', 'manual'),
    p_order->>'metodo_pago',
    p_order->>'cliente_nombre',
    p_order->>'cliente_telefono',
    NULLIF(p_order->>'cliente_email', ''),
    COALESCE(p_order->>'entrega', 'retiro'),
    NULLIF(p_order->>'direccion_envio', ''),
    NULLIF(p_order->>'nota', ''),
    v_total
  )
  RETURNING id INTO v_order_id;

  -- Insertar ítems
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Resolver IDs (pueden venir vacíos o null para ítems libres)
    v_product_id := CASE
      WHEN v_item->>'product_id' IS NOT NULL AND v_item->>'product_id' != ''
      THEN (v_item->>'product_id')::uuid
      ELSE NULL
    END;

    v_variant_id := CASE
      WHEN v_item->>'variant_id' IS NOT NULL AND v_item->>'variant_id' != ''
      THEN (v_item->>'variant_id')::uuid
      ELSE NULL
    END;

    -- Si tiene variant_id buscar nombres en DB; si es ítem libre usar los del JSON
    IF v_variant_id IS NOT NULL THEN
      SELECT p.nombre, pv.nombre_variante
      INTO v_nombre_prod, v_nombre_var
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = v_variant_id;
    ELSE
      v_nombre_prod := v_item->>'nombre_producto';
      v_nombre_var  := NULLIF(v_item->>'nombre_variante', '');
    END IF;

    INSERT INTO order_items (
      order_id, product_id, variant_id,
      nombre_producto, nombre_variante,
      cantidad, precio_unitario
    )
    VALUES (
      v_order_id,
      v_product_id,
      v_variant_id,
      v_nombre_prod,
      v_nombre_var,
      (v_item->>'cantidad')::int,
      (v_item->>'precio_unitario')::numeric
    );

    -- Descontar stock solo si hay variant_id
    IF v_variant_id IS NOT NULL THEN
      UPDATE product_variants
      SET stock = stock - (v_item->>'cantidad')::int
      WHERE id = v_variant_id
        AND stock >= (v_item->>'cantidad')::int;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock insuficiente para la variante "%"',
          COALESCE(v_nombre_var, v_variant_id::text);
      END IF;
    END IF;
  END LOOP;

  -- Registrar ingreso en finanzas
  INSERT INTO transactions (tipo, monto, descripcion, categoria, order_id)
  VALUES (
    'ingreso',
    v_total,
    'Venta manual: ' || COALESCE(p_order->>'cliente_nombre', 'Sin nombre'),
    'venta',
    v_order_id
  );

  RETURN v_order_id;
END;
$$;
