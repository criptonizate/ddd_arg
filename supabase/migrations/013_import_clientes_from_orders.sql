-- Importar clientes únicos desde orders a la tabla clientes
-- y linkear los pedidos existentes al cliente correspondiente

-- 1. Insertar clientes únicos (por nombre, case-insensitive)
WITH clientes_nuevos AS (
  SELECT DISTINCT ON (LOWER(TRIM(cliente_nombre)))
    TRIM(cliente_nombre)                       AS nombre,
    NULLIF(TRIM(cliente_telefono), '')         AS telefono,
    NULLIF(TRIM(COALESCE(cliente_email, '')), '') AS email,
    MIN(created_at) OVER (PARTITION BY LOWER(TRIM(cliente_nombre))) AS primera_compra
  FROM orders
  WHERE cliente_nombre IS NOT NULL
    AND TRIM(cliente_nombre) != ''
    AND NOT EXISTS (
      SELECT 1 FROM clientes c
      WHERE LOWER(c.nombre) = LOWER(TRIM(orders.cliente_nombre))
    )
  ORDER BY LOWER(TRIM(cliente_nombre)), created_at ASC
)
INSERT INTO clientes (nombre, telefono, email)
SELECT nombre, telefono, email
FROM clientes_nuevos;

-- 2. Linkear orders que no tienen cliente_id al cliente recién creado
UPDATE orders o
SET cliente_id = c.id
FROM clientes c
WHERE o.cliente_id IS NULL
  AND LOWER(TRIM(o.cliente_nombre)) = LOWER(c.nombre);
