-- ─────────────────────────────────────────────────────────────────────────────
-- 069_crear_pedido_atomico.sql
--
-- RPC `crear_pedido_filamento_atomico`: todo-en-uno para crear un pedido web.
--
-- Hace en UNA transacción:
--   1. Advisory lock sobre user_id (serializa canjes concurrentes del mismo user).
--   2. INSERT en filamento_pedidos.
--   3. Por cada item: FOR UPDATE filamento, valida stock-disponible = stock −
--      reservas_ajenas_activas, inserta en filamento_reservas.
--   4. Si hay canje: valida saldo vía get_saldo_coins (dentro del lock) e
--      inserta la fila de canje en ddd_coins.
--
-- Si algo falla, EXCEPTION → rollback total. Nada queda a medias:
-- no más pedido fantasma, no más oversell, no más descuento aplicado sin canje.
--
-- Devuelve { ok: true, id, numero, descuento_coins_aplicado }
--     o    { ok: false, error: '...' }
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION crear_pedido_filamento_atomico(
  p_user_id              UUID,
  p_cliente_nombre       TEXT,
  p_cliente_telefono     TEXT,
  p_items                JSONB,
  p_total_rollos         INTEGER,
  p_descuento_por_rollo  NUMERIC,
  p_descuento_coins      INTEGER,
  p_total                NUMERIC,
  p_puntos_a_canjear     INTEGER,
  p_reservado_hasta      TIMESTAMPTZ
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pedido_id            UUID;
  v_pedido_numero        BIGINT;
  v_item                 JSONB;
  v_filamento_id         UUID;
  v_gramos_item          INTEGER;
  v_fil                  filamentos%ROWTYPE;
  v_stock_total          INTEGER;
  v_reservado_ajeno      INTEGER;
  v_disponible           INTEGER;
  v_saldo                INTEGER;
BEGIN
  -- ── 1) Lock serializando concurrencia del mismo usuario ──────────────────
  PERFORM pg_advisory_xact_lock(hashtext('ddd_coins:' || p_user_id::text));

  -- ── 2) Insertar el pedido ─────────────────────────────────────────────────
  INSERT INTO filamento_pedidos (
    cliente_nombre, cliente_telefono, items, total_rollos,
    descuento_por_rollo, descuento_coins, total, estado,
    reservado_hasta, user_id
  ) VALUES (
    p_cliente_nombre, p_cliente_telefono, p_items, p_total_rollos,
    p_descuento_por_rollo, p_descuento_coins, p_total, 'pendiente',
    p_reservado_hasta, p_user_id
  )
  RETURNING id, numero INTO v_pedido_id, v_pedido_numero;

  -- ── 3) Reservar stock por item (FOR UPDATE + validación) ─────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_filamento_id := (v_item->>'filamento_id')::UUID;
    v_gramos_item  := ((v_item->>'rollos')::NUMERIC * 1000)::INTEGER;

    IF v_gramos_item IS NULL OR v_gramos_item <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida para ítem %', v_item;
    END IF;

    SELECT * INTO v_fil FROM filamentos WHERE id = v_filamento_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Filamento % no existe', v_filamento_id;
    END IF;

    v_stock_total := (COALESCE(v_fil.rollos_cerrados, 0) * COALESCE(v_fil.peso_rollo_gr, 1000))
                   + COALESCE(v_fil.gramos_sueltos, 0);

    SELECT COALESCE(SUM(gramos), 0) INTO v_reservado_ajeno
      FROM filamento_reservas
     WHERE filamento_id = v_filamento_id
       AND pedido_id <> v_pedido_id
       AND reservado_hasta > NOW();

    v_disponible := v_stock_total - v_reservado_ajeno;

    IF v_disponible < v_gramos_item THEN
      RAISE EXCEPTION 'Stock insuficiente para % (disponible: %g, pedido: %g)',
        v_fil.color, v_disponible, v_gramos_item;
    END IF;

    INSERT INTO filamento_reservas (pedido_id, filamento_id, gramos, reservado_hasta)
    VALUES (v_pedido_id, v_filamento_id, v_gramos_item, p_reservado_hasta);
  END LOOP;

  -- ── 4) Canje de coins (con saldo validado bajo el lock) ──────────────────
  IF p_puntos_a_canjear > 0 THEN
    SELECT get_saldo_coins(p_user_id) INTO v_saldo;
    IF v_saldo IS NULL OR v_saldo < p_puntos_a_canjear THEN
      RAISE EXCEPTION 'Saldo DDD Coins insuficiente (saldo: %, pedido: %)',
        COALESCE(v_saldo, 0), p_puntos_a_canjear;
    END IF;

    INSERT INTO ddd_coins (user_id, puntos, motivo, pedido_id)
    VALUES (p_user_id, -p_puntos_a_canjear, 'canje_pedido', v_pedido_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_pedido_id,
    'numero', v_pedido_numero,
    'descuento_coins_aplicado', p_descuento_coins
  );

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Canje duplicado detectado para este pedido';
  WHEN OTHERS THEN
    RAISE;
END;
$$;
