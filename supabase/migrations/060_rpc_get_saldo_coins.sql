-- RPC para calcular el saldo de DDD Coins server-side (más rápido que sumar en JS)

CREATE OR REPLACE FUNCTION get_saldo_coins(p_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(SUM(puntos), 0)::INT
  FROM ddd_coins
  WHERE user_id = p_user_id
$$;

-- Permitir que el service role y usuarios autenticados la ejecuten
GRANT EXECUTE ON FUNCTION get_saldo_coins(UUID) TO authenticated, service_role;
