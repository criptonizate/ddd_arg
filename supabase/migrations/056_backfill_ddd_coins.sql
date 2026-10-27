-- Backfill DDD Coins para clientes con compras anteriores
-- 10 pts por rollo en cada pedido confirmado/entregado
-- Todos los puntos fechados hoy (una sola vez, no re-ejecutar)

INSERT INTO ddd_coins (user_id, puntos, motivo, pedido_id, created_at)
SELECT
  fp.user_id,
  fp.total_rollos * 10 AS puntos,
  'compra'            AS motivo,
  fp.id               AS pedido_id,
  now()               AS created_at
FROM filamento_pedidos fp
WHERE
  fp.user_id IS NOT NULL
  AND fp.estado IN ('confirmado', 'entregado')
  AND fp.total_rollos > 0
  -- Evitar duplicar si ya existe una entrada para ese pedido
  AND NOT EXISTS (
    SELECT 1 FROM ddd_coins dc
    WHERE dc.pedido_id = fp.id AND dc.motivo = 'compra'
  );
