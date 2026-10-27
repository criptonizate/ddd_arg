-- Función atómica para descontar stock de un filamento
-- Evita race conditions usando FOR UPDATE lock en la fila
CREATE OR REPLACE FUNCTION descontar_stock_filamento(
  p_filamento_id UUID,
  p_gramos INTEGER,
  p_rollos INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_filamento filamentos%ROWTYPE;
  v_gramos_disponibles INTEGER;
  v_nuevos_rollos INTEGER;
  v_nuevos_gramos INTEGER;
  v_restante INTEGER;
  v_rollos_necesarios INTEGER;
BEGIN
  -- Lock de fila para evitar race conditions
  SELECT * INTO v_filamento FROM filamentos WHERE id = p_filamento_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Filamento no encontrado');
  END IF;

  -- Calcular gramos disponibles totales
  v_gramos_disponibles := (COALESCE(v_filamento.rollos_cerrados, 0) * COALESCE(v_filamento.peso_rollo_gr, 1000))
                         + COALESCE(v_filamento.gramos_sueltos, 0);

  IF v_gramos_disponibles < p_gramos THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Stock insuficiente');
  END IF;

  -- Descontar primero de gramos sueltos, luego de rollos
  v_nuevos_gramos := COALESCE(v_filamento.gramos_sueltos, 0);
  v_nuevos_rollos := COALESCE(v_filamento.rollos_cerrados, 0);
  v_restante := p_gramos;

  IF v_nuevos_gramos >= v_restante THEN
    v_nuevos_gramos := v_nuevos_gramos - v_restante;
    v_restante := 0;
  ELSE
    v_restante := v_restante - v_nuevos_gramos;
    v_nuevos_gramos := 0;
  END IF;

  IF v_restante > 0 THEN
    v_rollos_necesarios := CEIL(v_restante::FLOAT / COALESCE(v_filamento.peso_rollo_gr, 1000));
    v_nuevos_rollos := GREATEST(0, v_nuevos_rollos - v_rollos_necesarios);
    v_nuevos_gramos := GREATEST(0, v_rollos_necesarios * COALESCE(v_filamento.peso_rollo_gr, 1000) - v_restante);
  END IF;

  UPDATE filamentos
  SET
    gramos_sueltos  = v_nuevos_gramos,
    rollos_cerrados = v_nuevos_rollos,
    updated_at      = NOW()
  WHERE id = p_filamento_id;

  RETURN jsonb_build_object(
    'ok', true,
    'gramos_restantes', v_nuevos_gramos,
    'rollos_restantes', v_nuevos_rollos
  );
END;
$$;
