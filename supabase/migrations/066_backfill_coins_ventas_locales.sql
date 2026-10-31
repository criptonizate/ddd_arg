-- ─────────────────────────────────────────────────────────────────────────────
-- 066_backfill_coins_ventas_locales.sql
--
-- Backfill one-shot para corregir el bug de "venta local no otorgaba DDD Coins".
--
-- Paso 1: linkear filamento_ventas.user_id = NULL si cliente_id apunta a un
--         clientes.email que matchea un auth.users.email. Preserva lo que
--         ya tiene user_id.
--
-- Paso 2: por cada venta local con user_id NOT NULL y sin fila ddd_coins
--         "compra" asociada, insertar los puntos (gramos/100 = 10 pts/kg).
--
-- Idempotente: el unique index parcial impide duplicar. Se puede re-correr.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Paso 1: linkear user_id en ventas donde falta ──────────────────────────
UPDATE filamento_ventas v
   SET user_id = u.id
  FROM clientes c
  JOIN auth.users u
    ON LOWER(u.email) = LOWER(c.email)
 WHERE v.cliente_id = c.id
   AND v.user_id IS NULL
   AND c.email IS NOT NULL
   AND v.pedido_id IS NULL;

-- ── Paso 2: insertar ddd_coins "compra" para cada venta linkeada ───────────
-- La idempotencia la da el NOT EXISTS. El unique partial index actúa como
-- backstop ante inserts concurrentes (ignoramos 23505 en caller TS); no usamos
-- ON CONFLICT porque un unique INDEX (no CONSTRAINT) no es un target válido
-- para ON CONFLICT ON CONSTRAINT en Postgres.
INSERT INTO ddd_coins (user_id, puntos, motivo, venta_id, created_at)
SELECT
  v.user_id,
  CEIL(v.gramos / 100.0)::INTEGER AS puntos,
  'compra',
  v.id,
  v.created_at
FROM filamento_ventas v
WHERE v.user_id IS NOT NULL
  AND v.pedido_id IS NULL
  AND v.gramos > 0
  AND NOT EXISTS (
    SELECT 1 FROM ddd_coins c
     WHERE c.user_id = v.user_id
       AND c.venta_id = v.id
       AND c.motivo = 'compra'
  );
