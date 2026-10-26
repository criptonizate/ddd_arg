-- RLS para tablas de filamentos y pedidos
-- Solo la service role key (server actions) puede escribir.
-- La anon key solo puede leer filamentos visibles.

-- ── filamentos ────────────────────────────────────────────────────────────────
ALTER TABLE filamentos ENABLE ROW LEVEL SECURITY;

-- Cualquier visitante puede ver filamentos no ocultos (catálogo público)
CREATE POLICY "filamentos_select_public" ON filamentos
  FOR SELECT USING (oculto = false OR oculto IS NULL);

-- Solo service role puede insertar/actualizar/eliminar
CREATE POLICY "filamentos_write_service" ON filamentos
  FOR ALL USING (auth.role() = 'service_role');

-- ── filamento_movimientos ─────────────────────────────────────────────────────
ALTER TABLE filamento_movimientos ENABLE ROW LEVEL SECURITY;

-- Solo service role (nadie externo puede ver el historial de stock)
CREATE POLICY "movimientos_service_only" ON filamento_movimientos
  FOR ALL USING (auth.role() = 'service_role');

-- ── filamento_pedidos ─────────────────────────────────────────────────────────
ALTER TABLE filamento_pedidos ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve sus propios pedidos
CREATE POLICY "pedidos_select_own" ON filamento_pedidos
  FOR SELECT USING (auth.uid() = user_id);

-- Los usuarios autenticados pueden insertar sus propios pedidos
CREATE POLICY "pedidos_insert_own" ON filamento_pedidos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Solo service role puede actualizar/eliminar (admin confirma/cancela)
CREATE POLICY "pedidos_write_service" ON filamento_pedidos
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "pedidos_delete_service" ON filamento_pedidos
  FOR DELETE USING (auth.role() = 'service_role');

-- ── filamento_ventas ──────────────────────────────────────────────────────────
ALTER TABLE filamento_ventas ENABLE ROW LEVEL SECURITY;

-- Los usuarios ven sus propias ventas (historial de compras)
CREATE POLICY "ventas_select_own" ON filamento_ventas
  FOR SELECT USING (auth.uid() = user_id);

-- Solo service role puede escribir (el admin registra las ventas)
CREATE POLICY "ventas_write_service" ON filamento_ventas
  FOR ALL USING (auth.role() = 'service_role');

-- ── filamento_carrito ─────────────────────────────────────────────────────────
ALTER TABLE filamento_carrito ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve/modifica su propio carrito
CREATE POLICY "carrito_own" ON filamento_carrito
  FOR ALL USING (auth.uid() = user_id);

-- ── filamento_alertas_stock ───────────────────────────────────────────────────
ALTER TABLE filamento_alertas_stock ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve/modifica sus propias alertas
CREATE POLICY "alertas_own" ON filamento_alertas_stock
  FOR ALL USING (auth.uid() = user_id);

-- ── filamento_reservas ────────────────────────────────────────────────────────
ALTER TABLE filamento_reservas ENABLE ROW LEVEL SECURITY;

-- Solo service role (las reservas son internas al sistema)
CREATE POLICY "reservas_service_only" ON filamento_reservas
  FOR ALL USING (auth.role() = 'service_role');
