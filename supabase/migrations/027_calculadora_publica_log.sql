CREATE TABLE IF NOT EXISTS calculadora_publica_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  gramos numeric NOT NULL,
  horas numeric NOT NULL,
  costo_base numeric NOT NULL,
  precio_x3 numeric NOT NULL,
  precio_x4 numeric NOT NULL
);

ALTER TABLE calculadora_publica_log ENABLE ROW LEVEL SECURITY;

-- Solo el service role puede leer (admin) y cualquiera puede insertar (público)
CREATE POLICY "public insert" ON calculadora_publica_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "service read" ON calculadora_publica_log
  FOR SELECT USING (true);
