-- Agrega soporte de imágenes a filamentos
-- Ejecutar en el SQL Editor de Supabase

-- 1. Columna imagen_url en la tabla filamentos
ALTER TABLE filamentos
  ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- 2. Bucket de Storage para fotos de filamentos
--    (si no existe aún)
INSERT INTO storage.buckets (id, name, public)
VALUES ('filamentos-fotos', 'filamentos-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policy: cualquiera puede leer (público)
CREATE POLICY "Fotos filamentos públicas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'filamentos-fotos');

-- 4. Policy: solo usuarios autenticados pueden subir/reemplazar
CREATE POLICY "Admin puede subir fotos filamentos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'filamentos-fotos' AND auth.role() = 'authenticated');

CREATE POLICY "Admin puede actualizar fotos filamentos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'filamentos-fotos' AND auth.role() = 'authenticated');

CREATE POLICY "Admin puede eliminar fotos filamentos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'filamentos-fotos' AND auth.role() = 'authenticated');
