-- Agrega numero_cliente serial a user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS numero_cliente serial UNIQUE;

-- Crea filas para usuarios existentes que todavia no tienen perfil
INSERT INTO user_profiles (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT DO NOTHING;

-- Trigger: crea perfil automaticamente cuando se registra un usuario nuevo
CREATE OR REPLACE FUNCTION public.create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile_on_signup();
