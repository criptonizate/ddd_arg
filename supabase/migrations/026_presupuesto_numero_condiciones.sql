-- Agrega número incremental y condiciones de pago a presupuestos
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS condiciones_pago text;
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS numero integer;

-- Backfill filas existentes con números secuenciales por fecha
UPDATE presupuestos
SET numero = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM presupuestos
) sub
WHERE presupuestos.id = sub.id;

-- Crear secuencia para filas nuevas
CREATE SEQUENCE IF NOT EXISTS presupuesto_numero_seq;
SELECT setval('presupuesto_numero_seq', COALESCE((SELECT MAX(numero) FROM presupuestos), 0) + 1);
ALTER TABLE presupuestos ALTER COLUMN numero SET DEFAULT nextval('presupuesto_numero_seq');
