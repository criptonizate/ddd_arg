-- Regalo de bienvenida: 100 DDD Coins para usuarios registrados antes del 27-10-2026
-- Solo aplica a cuentas existentes — los nuevos registros no reciben este regalo

INSERT INTO ddd_coins (user_id, puntos, motivo, created_at)
SELECT
  u.id,
  100,
  'bienvenida',
  now()
FROM auth.users u
WHERE
  -- Solo cuentas creadas antes de hoy
  u.created_at < '2026-10-27T00:00:00Z'
  -- No duplicar si ya tiene el regalo
  AND NOT EXISTS (
    SELECT 1 FROM ddd_coins dc
    WHERE dc.user_id = u.id AND dc.motivo = 'bienvenida'
  );
