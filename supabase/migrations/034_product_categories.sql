CREATE TABLE IF NOT EXISTS product_categories (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON product_categories USING (true) WITH CHECK (true);

-- Seed con las categorías actuales
INSERT INTO product_categories (nombre) VALUES
  ('Religión'),
  ('Llaveros'),
  ('Sensorial - Anti stress'),
  ('Deportes'),
  ('Hogar'),
  ('Infantil'),
  ('Figuras y Personajes'),
  ('Accesorios'),
  ('Educación'),
  ('Personalizado'),
  ('Gamer'),
  ('Pastelería - Cortadores')
ON CONFLICT (nombre) DO NOTHING;
