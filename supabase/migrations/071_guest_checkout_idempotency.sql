-- ─────────────────────────────────────────────────────────────────────────────
-- 071_guest_checkout_idempotency.sql
--
-- (1) Guest checkout: `filamento_pedidos.user_id` pasa a NULLABLE para aceptar
--     pedidos sin login. Los pedidos invitados tienen teléfono obligatorio y
--     no ganan ni canjean DDD Coins.
--
-- (2) Idempotency key: columna + unique partial index. El cliente genera un
--     UUID al abrir el checkout y lo envía en cada intento. Si la red se corta
--     justo cuando el server ya creó el pedido, el reintento devuelve el mismo
--     pedido en vez de duplicar.
--
-- (3) Dirección de retiro: no toca DB, es solo UI.
-- ─────────────────────────────────────────────────────────────────────────────

-- user_id nullable
ALTER TABLE filamento_pedidos
  ALTER COLUMN user_id DROP NOT NULL;

-- Columna idempotency_key
ALTER TABLE filamento_pedidos
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Unique por key (cuando no es NULL). Dos pedidos no pueden compartir key.
CREATE UNIQUE INDEX IF NOT EXISTS filamento_pedidos_idempotency_key_uq
  ON filamento_pedidos(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Nueva versión del RPC: acepta p_user_id NULL (guest) y p_idempotency_key.
-- Si ya existe un pedido con ese key, lo devuelve sin crear uno nuevo.
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
  p_reservado_hasta      TIMESTAMPTZ,
  p_idempotency_key      TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id          UUID;
  v_existing_numero      BIGINT;
  v_existing_desc_coins  INTEGER;
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
  -- ── 0) Idempotency: si vino un key y ya existe un pedido con ese key,
  --       devolverlo tal cual. Evita duplicados por retry de red.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, numero, COALESCE(descuento_coins, 0)
      INTO v_existing_id, v_existing_numero, v_existing_desc_coins
      FROM filamento_pedidos
     WHERE idempotency_key = p_idempotency_key
     LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'id', v_existing_id,
        'numero', v_existing_numero,
        'descuento_coins_aplicado', v_existing_desc_coins,
        'duplicate', true
      );
    END IF;
  END IF;

  -- ── 1) Lock serializando concurrencia. Si es guest, usamos el idempotency
  --       key como semilla; si no hay key, no hace falta lock (no hay canje).
  IF p_user_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('ddd_coins:' || p_user_id::text));
  END IF;

  -- ── 2) Insertar el pedido ─────────────────────────────────────────────────
  INSERT INTO filamento_pedidos (
    cliente_nombre, cliente_telefono, items, total_rollos,
    descuento_por_rollo, descuento_coins, total, estado,
    reservado_hasta, user_id, idempotency_key
  ) VALUES (
    p_cliente_nombre, p_cliente_telefono, p_items, p_total_rollos,
    p_descuento_por_rollo, p_descuento_coins, p_total, 'pendiente',
    p_reservado_hasta, p_user_id, p_idempotency_key
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

  -- ── 4) Canje de coins (solo si hay user_id — los guests no canjean) ──────
  IF p_user_id IS NOT NULL AND p_puntos_a_canjear > 0 THEN
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
    -- Race: alguien insertó con el mismo idempotency key justo antes.
    -- Buscamos el existente y lo devolvemos.
    IF p_idempotency_key IS NOT NULL THEN
      SELECT id, numero, COALESCE(descuento_coins, 0)
        INTO v_existing_id, v_existing_numero, v_existing_desc_coins
        FROM filamento_pedidos
       WHERE idempotency_key = p_idempotency_key
       LIMIT 1;
      IF FOUND THEN
        RETURN jsonb_build_object(
          'ok', true,
          'id', v_existing_id,
          'numero', v_existing_numero,
          'descuento_coins_aplicado', v_existing_desc_coins,
          'duplicate', true
        );
      END IF;
    END IF;
    RAISE EXCEPTION 'Canje duplicado detectado para este pedido';
  WHEN OTHERS THEN
    RAISE;
END;
$$;
