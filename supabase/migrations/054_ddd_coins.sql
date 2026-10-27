-- DDD Coins: sistema de puntos para usuarios
-- Tabla principal de transacciones de DDD Coins
CREATE TABLE IF NOT EXISTS ddd_coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  puntos INTEGER NOT NULL, -- positivo = ganó, negativo = canjeó
  motivo TEXT NOT NULL,    -- 'login_diario', 'racha_7', 'racha_14', 'racha_30', 'compra', 'membresia_mensual', 'completar_perfil', 'canje_pedido'
  pedido_id UUID REFERENCES filamento_pedidos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ddd_coins_user_id_idx ON ddd_coins(user_id);
CREATE INDEX IF NOT EXISTS ddd_coins_created_at_idx ON ddd_coins(created_at);

-- Tabla para tracking del login diario y racha
CREATE TABLE IF NOT EXISTS ddd_coins_login (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  racha_dias INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE ddd_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE ddd_coins_login ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_coins" ON ddd_coins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_read_own_login" ON ddd_coins_login
  FOR SELECT USING (auth.uid() = user_id);

-- Service role puede escribir (server actions)
CREATE POLICY "service_write_coins" ON ddd_coins
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_write_login" ON ddd_coins_login
  FOR ALL USING (true) WITH CHECK (true);
