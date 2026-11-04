-- ─────────────────────────────────────────────────────────────────────────────
-- 068_rate_limit.sql
--
-- Rate limit simple via Postgres. No requiere Upstash/Redis externo.
--
-- `check_and_log_rate_limit(user_id, action, window_seconds, max_hits)` devuelve
-- true si está permitido (y registra el hit) o false si se excedió el límite.
--
-- Mantenemos solo los últimos N hits por (user_id, action) para que la tabla
-- no crezca indefinidamente.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL,
  action     TEXT NOT NULL,
  hit_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_limit_hits_lookup_idx
  ON rate_limit_hits (user_id, action, hit_at DESC);

ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- Solo service_role.

CREATE OR REPLACE FUNCTION check_and_log_rate_limit(
  p_user_id        UUID,
  p_action         TEXT,
  p_window_seconds INTEGER,
  p_max_hits       INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_recent_count
    FROM rate_limit_hits
   WHERE user_id = p_user_id
     AND action  = p_action
     AND hit_at >= NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  IF v_recent_count >= p_max_hits THEN
    RETURN FALSE;
  END IF;

  INSERT INTO rate_limit_hits (user_id, action) VALUES (p_user_id, p_action);

  -- Housekeeping: borrar hits viejos del usuario+acción (fuera de la ventana).
  DELETE FROM rate_limit_hits
   WHERE user_id = p_user_id
     AND action  = p_action
     AND hit_at < NOW() - INTERVAL '1 day';

  RETURN TRUE;
END;
$$;
