-- ═══════════════════════════════════════════════════════════════════════
-- APLICAR EN EL SQL EDITOR DE SUPABASE
-- Pegalo TODO y dale Run. Si alguna parte falla por 'already exists',
-- borra esa seccion y corre el resto.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 067 ─────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- 067_fase2_atomicidad_idempotencia.sql
--
-- Cierra agujeros encontrados en la auditoría de la Fase 2:
--
-- 1) RPC `restaurar_stock_filamento_atomico`: inverso de descontar_stock_filamento.
--    Restaura rollos cerrados y gramos sueltos en una tx, con FOR UPDATE. Antes,
--    `anularPedidoConfirmado` leía y escribía en JS (lost update + rollos
--    perdidos).
--
-- 2) RPC `anular_pedido_filamento_atomico`: todo-en-uno: valida estado,
--    restaura stock por cada ítem, borra las filas de ventas copiadas por el
--    confirm, revierte coins del pedido y marca "cancelado".
--
-- 3) Unique partial indexes para bonos NO ligados a pedido:
--    - login_diario: 1 por (user_id, día ART).
--    - racha_7 / racha_14 / racha_30: 1 por (user_id, motivo, día).
--    - membresia_mensual: 1 por (user_id, mes).
--    - completar_perfil: 1 por user_id.
--    Esto cierra la race de doble-click en registrarLoginDiario y en membresía
--    activa que antes dependía de un count() + insert en JS.
--
-- 4) Columna `confirmado_at` en filamento_pedidos: timestamp estable del
--    momento de confirmación. Antes la lógica de membresía usaba updated_at,
--    que se movía al editar nota/estado y corría la ventana de 30 días.
--    El confirm atómico la setea; migración backfillea con updated_at del
--    pedido ya confirmado.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── (1) RPC restaurar_stock_filamento_atomico ───────────────────────────────
CREATE OR REPLACE FUNCTION restaurar_stock_filamento_atomico(
  p_filamento_id UUID,
  p_gramos       INTEGER,
  p_rollos       INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fil           filamentos%ROWTYPE;
  v_peso_rollo    INTEGER;
  v_rollos_full   INTEGER;
  v_resto_g       INTEGER;
BEGIN
  SELECT * INTO v_fil FROM filamentos WHERE id = p_filamento_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Filamento no existe');
  END IF;

  v_peso_rollo := COALESCE(v_fil.peso_rollo_gr, 1000);
  -- Preferimos reponer como rollos cerrados cuando los gramos entran justo,
  -- y el remanente queda en gramos_sueltos. Así no se "degrada" un pedido que
  -- descontó rollos a sueltos indefinidamente.
  v_rollos_full := p_gramos / v_peso_rollo;
  v_resto_g     := p_gramos - (v_rollos_full * v_peso_rollo);

  UPDATE filamentos
     SET rollos_cerrados = COALESCE(rollos_cerrados, 0) + v_rollos_full,
         gramos_sueltos  = COALESCE(gramos_sueltos, 0)  + v_resto_g,
         updated_at      = NOW()
   WHERE id = p_filamento_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;


-- ── (2) RPC anular_pedido_filamento_atomico ─────────────────────────────────
CREATE OR REPLACE FUNCTION anular_pedido_filamento_atomico(
  p_pedido_id UUID,
  p_nota      TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pedido        filamento_pedidos%ROWTYPE;
  v_item          JSONB;
  v_filamento_id  UUID;
  v_rollos        INTEGER;
  v_gramos        INTEGER;
  v_restaurar_res JSONB;
BEGIN
  SELECT * INTO v_pedido FROM filamento_pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pedido no encontrado');
  END IF;

  IF v_pedido.estado = 'cancelado' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El pedido ya está cancelado');
  END IF;

  -- Si estaba confirmado, hay que restaurar stock y borrar las ventas asociadas.
  IF v_pedido.estado = 'confirmado' OR v_pedido.estado = 'entregado' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_pedido.items)
    LOOP
      v_filamento_id := (v_item->>'filamento_id')::UUID;
      v_rollos       := (v_item->>'rollos')::INTEGER;
      v_gramos       := v_rollos * 1000;

      v_restaurar_res := restaurar_stock_filamento_atomico(v_filamento_id, v_gramos, v_rollos);
      IF NOT (v_restaurar_res->>'ok')::BOOLEAN THEN
        RAISE EXCEPTION 'No se pudo restaurar stock de %: %', v_filamento_id, v_restaurar_res->>'error';
      END IF;
    END LOOP;

    DELETE FROM filamento_ventas WHERE pedido_id = p_pedido_id;
  END IF;

  -- Siempre: liberar reservas y revertir coins
  DELETE FROM filamento_reservas WHERE pedido_id = p_pedido_id;
  DELETE FROM ddd_coins WHERE pedido_id = p_pedido_id;

  UPDATE filamento_pedidos
     SET estado     = 'cancelado',
         nota       = COALESCE(p_nota, 'Pedido anulado'),
         updated_at = NOW()
   WHERE id = p_pedido_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;


-- ── (3) Unique partial indexes para idempotencia de bonos ──────────────────
-- login_diario: una fila por user_id por día ART. Usamos date_trunc en ART
-- (UTC−3): created_at - interval '3 hours', truncado a 'day'.
CREATE UNIQUE INDEX IF NOT EXISTS ddd_coins_login_diario_uq
  ON ddd_coins (
    user_id,
    (date_trunc('day', created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'))
  )
  WHERE motivo = 'login_diario' AND pedido_id IS NULL;

-- rachas (7/14/30): una por (user_id, motivo, día ART).
CREATE UNIQUE INDEX IF NOT EXISTS ddd_coins_racha_uq
  ON ddd_coins (
    user_id,
    motivo,
    (date_trunc('day', created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'))
  )
  WHERE motivo IN ('racha_7', 'racha_14', 'racha_30') AND pedido_id IS NULL;

-- membresía mensual: una por (user_id, mes ART).
CREATE UNIQUE INDEX IF NOT EXISTS ddd_coins_membresia_mensual_uq
  ON ddd_coins (
    user_id,
    (date_trunc('month', created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'))
  )
  WHERE motivo = 'membresia_mensual' AND pedido_id IS NULL;

-- completar_perfil: una por user_id, única histórica.
CREATE UNIQUE INDEX IF NOT EXISTS ddd_coins_completar_perfil_uq
  ON ddd_coins (user_id)
  WHERE motivo = 'completar_perfil' AND pedido_id IS NULL;


-- ── (4) Columna confirmado_at ───────────────────────────────────────────────
ALTER TABLE filamento_pedidos
  ADD COLUMN IF NOT EXISTS confirmado_at TIMESTAMPTZ;

-- Backfill: para pedidos ya confirmados o entregados, usar updated_at como
-- aproximación (es lo mejor que tenemos; a partir de ahora el RPC lo setea bien).
UPDATE filamento_pedidos
   SET confirmado_at = updated_at
 WHERE confirmado_at IS NULL
   AND estado IN ('confirmado', 'entregado');

-- Actualizar confirmar_pedido_filamento_atomico para setear confirmado_at.
CREATE OR REPLACE FUNCTION confirmar_pedido_filamento_atomico(
  p_pedido_id UUID,
  p_nota      TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pedido              filamento_pedidos%ROWTYPE;
  v_item                JSONB;
  v_filamento_id        UUID;
  v_rollos              INTEGER;
  v_gramos              INTEGER;
  v_precio_unitario     NUMERIC;
  v_color               TEXT;
  v_costo               NUMERIC;
  v_descuento_rollo     NUMERIC;
  v_precio_real         NUMERIC;
  v_descontar_result    JSONB;
  v_fecha               DATE := CURRENT_DATE;
BEGIN
  SELECT * INTO v_pedido FROM filamento_pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pedido no encontrado');
  END IF;

  IF v_pedido.estado <> 'pendiente' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El pedido ya está ' || v_pedido.estado);
  END IF;

  v_descuento_rollo := COALESCE(v_pedido.descuento_por_rollo, 0);

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_pedido.items)
  LOOP
    v_filamento_id    := (v_item->>'filamento_id')::UUID;
    v_rollos          := (v_item->>'rollos')::INTEGER;
    v_precio_unitario := (v_item->>'precio_unitario')::NUMERIC;
    v_color           := v_item->>'color';
    v_gramos          := v_rollos * 1000;

    v_descontar_result := descontar_stock_filamento(v_filamento_id, v_gramos, v_rollos);
    IF NOT (v_descontar_result->>'ok')::BOOLEAN THEN
      RAISE EXCEPTION 'Stock insuficiente para % (%)', v_color, v_descontar_result->>'error';
    END IF;

    SELECT COALESCE(costo_kg, 0) INTO v_costo FROM filamentos WHERE id = v_filamento_id;

    v_precio_real := GREATEST(0, v_precio_unitario - v_descuento_rollo);

    INSERT INTO filamento_ventas (
      filamento_id, gramos, precio_kg, costo_kg, cliente, nota, fecha, user_id, pedido_id
    ) VALUES (
      v_filamento_id,
      v_gramos,
      v_precio_real,
      v_costo,
      v_pedido.cliente_nombre,
      CASE WHEN v_descuento_rollo > 0
           THEN 'Pedido web N°' || v_pedido.numero || ' — descuento membresía: -$' || v_descuento_rollo || '/kg'
           ELSE 'Pedido web N°' || v_pedido.numero
      END,
      v_fecha,
      v_pedido.user_id,
      p_pedido_id
    );
  END LOOP;

  DELETE FROM filamento_reservas WHERE pedido_id = p_pedido_id;

  UPDATE filamento_pedidos
     SET estado        = 'confirmado',
         nota          = COALESCE(p_nota, nota),
         confirmado_at = COALESCE(confirmado_at, NOW()),
         updated_at    = NOW()
   WHERE id = p_pedido_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;


-- ── (5) Audit log mínimo ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action      TEXT NOT NULL,
  target      TEXT,
  target_id   TEXT,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx    ON admin_audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx   ON admin_audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx   ON admin_audit_log (target, target_id, created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Solo service_role lee/escribe. Nadie más.

-- ── 068 ─────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- 068_rate_limit.sql
--
-- Rate limit simple via Postgres. No requiere Upstash/Redis externo.
--
-- `check_and_log_rate_limit(user_id, action, window_seconds, max_hits)` devuelve
-- true si está permitido (y registra el hit) o false si se excedió el límite.
--
-- Mantenemos solo los últimos N hits por (user_id, action) para que la tabla
-- no crezca indefinidamente.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL,
  action     TEXT NOT NULL,
  hit_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_limit_hits_lookup_idx
  ON rate_limit_hits (user_id, action, hit_at DESC);

ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- Solo service_role.

CREATE OR REPLACE FUNCTION check_and_log_rate_limit(
  p_user_id        UUID,
  p_action         TEXT,
  p_window_seconds INTEGER,
  p_max_hits       INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_recent_count
    FROM rate_limit_hits
   WHERE user_id = p_user_id
     AND action  = p_action
     AND hit_at >= NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  IF v_recent_count >= p_max_hits THEN
    RETURN FALSE;
  END IF;

  INSERT INTO rate_limit_hits (user_id, action) VALUES (p_user_id, p_action);

  -- Housekeeping: borrar hits viejos del usuario+acción (fuera de la ventana).
  DELETE FROM rate_limit_hits
   WHERE user_id = p_user_id
     AND action  = p_action
     AND hit_at < NOW() - INTERVAL '1 day';

  RETURN TRUE;
END;
$$;

-- ── 069 ─────────────────────────────────────────────────────────────────
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

-- ── 070 ─────────────────────────────────────────────────────────────────
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
