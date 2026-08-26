ALTER TABLE orders ADD COLUMN IF NOT EXISTS es_consignacion boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dias_devolucion integer NOT NULL DEFAULT 15;
