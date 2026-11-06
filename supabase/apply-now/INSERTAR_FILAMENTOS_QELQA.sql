-- ─────────────────────────────────────────────────────────────────────────────
-- Inserta los 8 filamentos PLA de la marca Qelqa con el stock inicial.
-- Material: PLA · Tipo: Común · Precio: $22.000/kg (default)
-- Rollos de 1 kg, sin foto todavía (las carga el admin desde el panel).
--
-- Idempotente: si ya existe el mismo (marca, material, color), no inserta.
-- Pegar este archivo en el SQL Editor de Supabase y ejecutar una sola vez.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO filamentos (nombre, marca, material, tipo, color, rollos_cerrados, gramos_sueltos, peso_rollo_gr, costo_kg, precio_kg)
SELECT 'PLA Qelqa', 'Qelqa', 'PLA', 'Común', color, rollos, 0, 1000, 0, 22000
FROM (VALUES
  ('Rojo',          30),
  ('Rosa Chicle',   15),
  ('Fucsia',        10),
  ('Verde Militar', 15),
  ('Verde Oliva',   15),
  ('Marrón',        15),
  ('Almendra',      10),
  ('Violeta',       20)
) AS t(color, rollos)
WHERE NOT EXISTS (
  SELECT 1 FROM filamentos f
  WHERE f.marca = 'Qelqa'
    AND f.material = 'PLA'
    AND f.color = t.color
);

-- Verificación — tras ejecutar, deberías ver 8 filas de Qelqa.
-- SELECT marca, color, rollos_cerrados, precio_kg FROM filamentos
--  WHERE marca = 'Qelqa' ORDER BY color;
