-- ─────────────────────────────────────────────────────────────────────────────
-- Soporte Mercado Pago (Checkout Pro) para filamento_pedidos.
--
-- Flujo:
--   1. Cliente elige "Mercado Pago" en checkout.
--   2. Se crea el pedido con metodo_pago='mercadopago', mp_status='pending'.
--   3. Backend crea una Preference en MP y guarda mp_preference_id + mp_init_point.
--   4. Cliente va a mp_init_point, paga.
--   5. MP llama al webhook /api/mp/webhook con payment_id.
--   6. Verificamos el payment en MP; si approved -> confirmamos el pedido (descontamos stock).
--      Si rejected/cancelled -> marcamos mp_status y dejamos el pedido pendiente para que
--      el admin decida (contactar al cliente, cancelar, etc).
--
-- metodo_pago = 'local' (retiro / WhatsApp / efectivo al coordinar) es el default.
-- metodo_pago = 'mercadopago' usa los otros campos.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE filamento_pedidos
  ADD COLUMN IF NOT EXISTS metodo_pago      TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS mp_preference_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_init_point    TEXT,
  ADD COLUMN IF NOT EXISTS mp_payment_id    TEXT,
  ADD COLUMN IF NOT EXISTS mp_status        TEXT;

-- Constraint sobre valores válidos de metodo_pago
ALTER TABLE filamento_pedidos
  DROP CONSTRAINT IF EXISTS filamento_pedidos_metodo_pago_check;
ALTER TABLE filamento_pedidos
  ADD  CONSTRAINT filamento_pedidos_metodo_pago_check
  CHECK (metodo_pago IN ('local', 'mercadopago'));

-- Idempotencia del webhook: no procesar dos veces el mismo payment_id.
CREATE UNIQUE INDEX IF NOT EXISTS filamento_pedidos_mp_payment_id_uq
  ON filamento_pedidos (mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;

-- Lookup rápido por preference cuando el usuario vuelve del checkout de MP.
CREATE INDEX IF NOT EXISTS filamento_pedidos_mp_preference_id_idx
  ON filamento_pedidos (mp_preference_id)
  WHERE mp_preference_id IS NOT NULL;

COMMENT ON COLUMN filamento_pedidos.metodo_pago      IS 'local | mercadopago';
COMMENT ON COLUMN filamento_pedidos.mp_preference_id IS 'ID de la Preference creada en MP';
COMMENT ON COLUMN filamento_pedidos.mp_init_point    IS 'URL del Checkout Pro donde redirigir al cliente';
COMMENT ON COLUMN filamento_pedidos.mp_payment_id    IS 'ID del payment confirmado por el webhook';
COMMENT ON COLUMN filamento_pedidos.mp_status        IS 'pending | approved | in_process | rejected | cancelled | refunded';
