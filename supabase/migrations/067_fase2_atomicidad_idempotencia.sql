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
