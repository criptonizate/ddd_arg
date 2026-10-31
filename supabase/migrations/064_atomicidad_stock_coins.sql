-- ─────────────────────────────────────────────────────────────────────────────
-- 064_atomicidad_stock_coins.sql
--
-- Tres cambios atómicos para cerrar las últimas races del sistema de pedidos:
--
-- 1) UNIQUE partial index en `ddd_coins (user_id, pedido_id, motivo)` para
--    `pedido_id IS NOT NULL`. Elimina la última race de doble-canje / doble-ganancia
--    (el guard JS en `sumarPuntosPorCompra` y `canjearCoinsEnPedido` es best-effort;
--    este constraint lo hace definitivo a nivel DB).
--
-- 2) RPC `reservar_pedido_filamento(p_pedido_id, p_items, p_reservado_hasta)`:
--    valida y reserva stock de forma atómica. Para cada ítem toma FOR UPDATE sobre
--    el filamento, calcula stock_disponible = stock_total − reservas_activas, y
--    rechaza si no alcanza. Si algún ítem falla, la transacción se rollea entera
--    (ninguna reserva queda insertada).
--
-- 3) RPC `confirmar_pedido_filamento_atomico(p_pedido_id)`:
--    descuenta stock + crea ventas + marca confirmado como una sola unidad. Si
--    falla el descuento de un ítem, rollback total (antes podía quedar media
--    confirmación con stock descontado y pedido todavía "pendiente").
-- ─────────────────────────────────────────────────────────────────────────────

-- ── (1) Unique constraint anti doble-canje / doble-ganancia ─────────────────
-- Partial index: solo filas con pedido_id NOT NULL (el login_diario, racha, etc.
-- no tienen pedido_id y no deben entrar en el constraint).
--
-- NOTA: si ya existieran duplicados históricos esta migración falla. En ese
-- caso, limpiarlos primero con:
--   DELETE FROM ddd_coins a USING ddd_coins b
--   WHERE a.ctid < b.ctid AND a.user_id = b.user_id
--     AND a.pedido_id = b.pedido_id AND a.motivo = b.motivo;
CREATE UNIQUE INDEX IF NOT EXISTS ddd_coins_user_pedido_motivo_uq
  ON ddd_coins (user_id, pedido_id, motivo)
  WHERE pedido_id IS NOT NULL;


-- ── (2) RPC: reservar stock de forma atómica ────────────────────────────────
-- p_items JSONB es un array de { filamento_id uuid, gramos int }.
-- Devuelve { ok: true } o { ok: false, error: '...', filamento_id: '...' }.
CREATE OR REPLACE FUNCTION reservar_pedido_filamento(
  p_pedido_id       UUID,
  p_items           JSONB,
  p_reservado_hasta TIMESTAMPTZ
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item              JSONB;
  v_filamento_id      UUID;
  v_gramos            INTEGER;
  v_fil               filamentos%ROWTYPE;
  v_stock_total       INTEGER;
  v_reservado_activo  INTEGER;
  v_disponible        INTEGER;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_filamento_id := (v_item->>'filamento_id')::UUID;
    v_gramos       := (v_item->>'gramos')::INTEGER;

    IF v_gramos IS NULL OR v_gramos <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida para ítem %', v_item;
    END IF;

    -- Lock de la fila del filamento. Si otra tx está reservando el mismo
    -- filamento, esta espera hasta que termine.
    SELECT * INTO v_fil FROM filamentos WHERE id = v_filamento_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Filamento % no existe', v_filamento_id;
    END IF;

    v_stock_total := (COALESCE(v_fil.rollos_cerrados, 0) * COALESCE(v_fil.peso_rollo_gr, 1000))
                   + COALESCE(v_fil.gramos_sueltos, 0);

    -- Reservas activas (no vencidas) para el mismo filamento, excluyendo las
    -- de este pedido (por si re-reservamos por alguna razón).
    SELECT COALESCE(SUM(gramos), 0) INTO v_reservado_activo
      FROM filamento_reservas
     WHERE filamento_id = v_filamento_id
       AND reservado_hasta > NOW()
       AND pedido_id <> p_pedido_id;

    v_disponible := v_stock_total - v_reservado_activo;

    IF v_disponible < v_gramos THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Stock insuficiente — ya está reservado por otro cliente',
        'filamento_id', v_filamento_id,
        'disponible_gramos', v_disponible,
        'solicitado_gramos', v_gramos
      );
    END IF;

    INSERT INTO filamento_reservas (pedido_id, filamento_id, gramos, reservado_hasta)
    VALUES (p_pedido_id, v_filamento_id, v_gramos, p_reservado_hasta);
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;


-- ── (3) RPC: confirmar pedido de forma atómica ─────────────────────────────
-- Hace todo lo que `confirmarPedidoYDescontarStock` hacía en JS, pero en una
-- sola transacción. Si falla cualquier item, nada queda a medio hacer.
--
-- Devuelve { ok: true } o { ok: false, error: '...' }.
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

    -- Descontar stock (atómico) — si falla, EXCEPTION aborta todo
    v_descontar_result := descontar_stock_filamento(v_filamento_id, v_gramos, v_rollos);
    IF NOT (v_descontar_result->>'ok')::BOOLEAN THEN
      RAISE EXCEPTION 'Stock insuficiente para % (%)', v_color, v_descontar_result->>'error';
    END IF;

    -- Costo del filamento (puede ser null → 0)
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

  -- Liberar reservas (stock ya descontado del real)
  DELETE FROM filamento_reservas WHERE pedido_id = p_pedido_id;

  UPDATE filamento_pedidos
     SET estado     = 'confirmado',
         nota       = COALESCE(p_nota, nota),
         updated_at = NOW()
   WHERE id = p_pedido_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
