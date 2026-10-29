-- Agregar columna nota separada (en vez de parsear mensaje) + RLS DELETE para cliente

ALTER TABLE filamento_sugerencias
  ADD COLUMN IF NOT EXISTS nota text;

-- Backfill: extraer nota de los mensajes con formato "Pedido de color: X. Y"
UPDATE filamento_sugerencias
SET nota = SUBSTRING(mensaje FROM POSITION('. ' IN mensaje) + 2)
WHERE color IS NOT NULL
  AND nota IS NULL
  AND POSITION('. ' IN mensaje) > 0
  AND mensaje LIKE 'Pedido de color:%';

-- Policy DELETE: el cliente puede borrar sus propias sugerencias pendientes
CREATE POLICY IF NOT EXISTS "sugerencias_delete_own_pendiente"
  ON filamento_sugerencias
  FOR DELETE
  USING (auth.uid() = user_id AND estado = 'pendiente');

-- Policy UPDATE para el cliente — marcar como visto
CREATE POLICY IF NOT EXISTS "sugerencias_update_visto_own"
  ON filamento_sugerencias
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
