-- Corregir RLS: las policies service_write_* son innecesarias y peligrosas
-- El service role ya bypasea RLS por definición — no necesita policy explícita
-- Sin estas policies, usuarios anon/authenticated no pueden escribir directamente

DROP POLICY IF EXISTS "service_write_coins"  ON ddd_coins;
DROP POLICY IF EXISTS "service_write_login"  ON ddd_coins_login;
