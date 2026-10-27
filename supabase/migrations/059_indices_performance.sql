-- Índices de performance en tablas muy consultadas
-- Impacto: 50-200ms menos por request en /cuenta, admin y getMembresiaCliente

CREATE INDEX IF NOT EXISTS filamento_pedidos_user_id_idx
  ON filamento_pedidos(user_id);

CREATE INDEX IF NOT EXISTS filamento_pedidos_estado_idx
  ON filamento_pedidos(estado);

CREATE INDEX IF NOT EXISTS filamento_pedidos_user_estado_idx
  ON filamento_pedidos(user_id, estado);

CREATE INDEX IF NOT EXISTS ddd_coins_user_motivo_idx
  ON ddd_coins(user_id, motivo);

CREATE INDEX IF NOT EXISTS ddd_coins_user_created_idx
  ON ddd_coins(user_id, created_at DESC);
