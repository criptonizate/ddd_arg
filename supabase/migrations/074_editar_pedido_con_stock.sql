-- RPC `editar_pedido_filamento_con_stock`
--
-- Permite editar items de un pedido (pendiente O confirmado) ajustando el stock:
--
-- Pendiente: reemplaza las reservas en filamento_reservas.
-- Confirmado: restaura el stock viejo → actualiza filamento_ventas → descuenta el nuevo stock.
--
-- Idempotente en items repetidos porque primero libera todo lo anterior.

CREATE OR REPLACE FUNCTION editar_pedido_filamento_con_stock(
  p_pedido_id          UUID,
  p_items              JSONB,
  p_descuento_por_rollo NUMERIC DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pedido      filamento_pedidos%ROWTYPE;
  v_old_item    JSONB;
  v_new_item    JSONB;
  v_fil_id      UUID;
  v_rollos      INTEGER;
  v_gramos      INTEGER;
  v_precio_unit NUMERIC;
  v_precio_real NUMERIC;
  v_costo       NUMERIC;
  v_total_rollos INTEGER := 0;
  v_subtotal    NUMERIC  := 0;
  v_total       NUMERIC  := 0;
BEGIN
  SELECT * INTO v_pedido
    FROM filamento_pedidos
   WHERE id = p_pedido_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pedido no encontrado');
  END IF;

  IF v_pedido.estado NOT IN ('pendiente', 'confirmado') THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'Solo se pueden editar pedidos pendientes o confirmados (este está "' || v_pedido.estado || '")');
  END IF;

  -- ── Caso: CONFIRMADO ────────────────────────────────────────────────────────
  IF v_pedido.estado = 'confirmado' THEN

    -- 1. Restaurar stock de cada item viejo
    FOR v_old_item IN SELECT * FROM jsonb_array_elements(v_pedido.items)
    LOOP
      v_fil_id := (v_old_item->>'filamento_id')::UUID;
      v_gramos := (v_old_item->>'rollos')::INTEGER * 1000;
      UPDATE filamentos SET stock = stock + v_gramos WHERE id = v_fil_id;
    END LOOP;

    -- 2. Borrar ventas registradas para este pedido
    DELETE FROM filamento_ventas WHERE pedido_id = p_pedido_id;

    -- 3. Descontar nuevo stock e insertar nuevas ventas
    FOR v_new_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      v_fil_id      := (v_new_item->>'filamento_id')::UUID;
      v_rollos      := (v_new_item->>'rollos')::INTEGER;
      v_gramos      := v_rollos * 1000;
      v_precio_unit := (v_new_item->>'precio_unitario')::NUMERIC;
      v_precio_real := GREATEST(0, v_precio_unit - p_descuento_por_rollo);

      SELECT COALESCE(costo_kg, 0) INTO v_costo FROM filamentos WHERE id = v_fil_id;

      UPDATE filamentos SET stock = stock - v_gramos WHERE id = v_fil_id;

      INSERT INTO filamento_ventas (
        filamento_id, gramos, precio_kg, costo_kg,
        cliente, nota, fecha, user_id, pedido_id
      ) VALUES (
        v_fil_id, v_gramos, v_precio_real, v_costo,
        v_pedido.cliente_nombre,
        'Pedido web N°' || v_pedido.numero || ' (editado por admin)',
        CURRENT_DATE, v_pedido.user_id, p_pedido_id
      );

      v_subtotal    := v_subtotal + v_rollos * v_precio_real;
      v_total_rollos := v_total_rollos + v_rollos;
    END LOOP;

  -- ── Caso: PENDIENTE ─────────────────────────────────────────────────────────
  ELSE

    -- Reemplazar reservas
    DELETE FROM filamento_reservas WHERE pedido_id = p_pedido_id;

    FOR v_new_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      v_fil_id  := (v_new_item->>'filamento_id')::UUID;
      v_rollos  := (v_new_item->>'rollos')::INTEGER;
      v_gramos  := v_rollos * 1000;
      v_precio_unit := (v_new_item->>'precio_unitario')::NUMERIC;
      v_precio_real := GREATEST(0, v_precio_unit - p_descuento_por_rollo);

      INSERT INTO filamento_reservas (pedido_id, filamento_id, gramos, reservado_hasta)
      VALUES (p_pedido_id, v_fil_id, v_gramos, v_pedido.reservado_hasta);

      v_subtotal    := v_subtotal + v_rollos * v_precio_real;
      v_total_rollos := v_total_rollos + v_rollos;
    END LOOP;

  END IF;

  -- Total final respetando coins ya canjeados
  v_total := GREATEST(0, v_subtotal - COALESCE(v_pedido.descuento_coins, 0));

  UPDATE filamento_pedidos
     SET items               = p_items,
         total_rollos        = v_total_rollos,
         descuento_por_rollo = p_descuento_por_rollo,
         total               = v_total,
         updated_at          = NOW()
   WHERE id = p_pedido_id;

  RETURN jsonb_build_object(
    'ok',                 true,
    'total',              v_total,
    'total_rollos',       v_total_rollos,
    'descuento_por_rollo', p_descuento_por_rollo
  );
END;
$$;
