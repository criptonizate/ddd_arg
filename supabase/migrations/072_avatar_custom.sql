-- ─────────────────────────────────────────────────────────────────────────────
-- 072_avatar_custom.sql
--
-- Permite al cliente reemplazar la foto de Google por una propia que subimos
-- al bucket `avatars`. La URL queda guardada en user_profiles.avatar_url y el
-- fallback sigue siendo la foto de Google (auth.users.user_metadata.avatar_url).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Bucket público para que las fotos se vean sin firmar URLs.
-- Las reglas de seguridad van a nivel de objeto (ver policies abajo).
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

-- Lectura pública (necesaria para que cualquier <img src=...> funcione).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'avatars_public_read'
  ) THEN
    CREATE POLICY "avatars_public_read"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'avatars');
  END IF;
END $$;

-- Cada usuario sube/sobrescribe/elimina SOLO archivos dentro de su carpeta
-- {user_id}/… — no puede tocar la de otro usuario.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'avatars_owner_insert'
  ) THEN
    CREATE POLICY "avatars_owner_insert"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'avatars_owner_update'
  ) THEN
    CREATE POLICY "avatars_owner_update"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'avatars_owner_delete'
  ) THEN
    CREATE POLICY "avatars_owner_delete"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
