-- ─────────────────────────────────────────────────────────────────────────────
-- 065_ddd_coins_por_venta.sql
--
-- Antes: solo las compras hechas desde la tienda web otorgaban DDD Coins. Las
-- ventas registradas por admin en el local (filamento_ventas sin pedido_id) no
-- otorgaban coins aunque la venta estuviera asociada a un user_id. Esto dejaba
-- a los clientes del local sin puntos por sus compras.
--
-- Agregamos:
-- 1) Columna `venta_id` opcional en ddd_coins (referencia a filamento_ventas).
-- 2) UNIQUE partial index sobre (user_id, venta_id, motivo) WHERE venta_id IS
--    NOT NULL, con la misma garantía de idempotencia que para pedido_id.
-- 3) ON DELETE SET NULL: si una venta se borra, el ddd_coin asociado NO
--    desaparece — queda huerfano con venta_id=NULL (el usuario conserva
--    los puntos; si querés revertirlos, usá revertirCoinsDeVenta explícito).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE ddd_coins
  ADD COLUMN IF NOT EXISTS venta_id UUID REFERENCES filamento_ventas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ddd_coins_venta_id_idx
  ON ddd_coins(venta_id)
  WHERE venta_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ddd_coins_user_venta_motivo_uq
  ON ddd_coins (user_id, venta_id, motivo)
  WHERE venta_id IS NOT NULL;
