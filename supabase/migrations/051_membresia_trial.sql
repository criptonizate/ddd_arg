-- Trial de membresía Mayorista para nuevos usuarios (5 días desde el registro)
CREATE TABLE IF NOT EXISTS membresia_trial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  trial_fin timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE membresia_trial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trial_select_own" ON membresia_trial
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger: al crear un usuario nuevo, insertar trial de 5 días
CREATE OR REPLACE FUNCTION public.crear_trial_nuevo_usuario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.membresia_trial (user_id, trial_fin)
  VALUES (NEW.id, NOW() + INTERVAL '5 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_trial ON auth.users;
CREATE TRIGGER on_auth_user_created_trial
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.crear_trial_nuevo_usuario();
