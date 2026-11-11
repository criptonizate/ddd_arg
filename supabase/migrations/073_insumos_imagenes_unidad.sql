-- Agregar imágenes extra y campo unidad a tabla insumos
ALTER TABLE insumos
  ADD COLUMN IF NOT EXISTS imagen_url_2 text,
  ADD COLUMN IF NOT EXISTS imagen_url_3 text,
  ADD COLUMN IF NOT EXISTS unidad text NOT NULL DEFAULT 'unidad'
    CHECK (unidad IN ('unidad', 'kg', 'gramos'));

-- Bucket para fotos de insumos (ejecutar desde Supabase Storage si no existe)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('insumos-fotos', 'insumos-fotos', true)
-- ON CONFLICT (id) DO NOTHING;
