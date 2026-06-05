-- Columnas faltantes en product_variants (usadas en VariantManager pero nunca migradas)

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS stock_minimo integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS color        text,
  ADD COLUMN IF NOT EXISTS "tamaño"     text;

-- Función RPC: stock bajo (reemplaza intento fallido de 015)
CREATE OR REPLACE FUNCTION get_stock_bajo()
RETURNS TABLE(
  id              uuid,
  product_id      uuid,
  nombre_variante text,
  color           text,
  "tamaño"        text,
  precio          numeric,
  stock           integer,
  stock_minimo    integer,
  created_at      timestamptz,
  product_nombre  text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    pv.id,
    pv.product_id,
    pv.nombre_variante,
    pv.color,
    pv.tamaño,
    pv.precio,
    pv.stock,
    pv.stock_minimo,
    pv.created_at,
    p.nombre AS product_nombre
  FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  WHERE pv.stock <= pv.stock_minimo
  ORDER BY pv.stock ASC;
$$;
