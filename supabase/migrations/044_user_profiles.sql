CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telefono text,
  dni text,
  sexo text CHECK (sexo IN ('M', 'F', 'otro')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile_select" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_own_profile_upsert" ON user_profiles
  FOR ALL USING (auth.uid() = user_id);
