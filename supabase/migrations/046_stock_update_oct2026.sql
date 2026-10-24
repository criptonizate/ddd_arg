-- Actualización de stock - Octubre 2026
-- Para cada grupo: primero UPDATE (actualiza precio en los que ya existen),
-- luego INSERT condicional (solo si no existe ese color).

-- ── Filanova PLA+ High Speed ($22.000/kg) ─────────────────────────────────────

UPDATE filamentos SET costo_kg = 22000, precio_kg = 22000, updated_at = now()
WHERE marca = 'Filanova' AND material = 'PLA' AND tipo = 'High Speed';

INSERT INTO filamentos (nombre, marca, material, tipo, color, rollos_cerrados, gramos_sueltos, peso_rollo_gr, costo_kg, precio_kg)
SELECT 'PLA+ Chroma HS', 'Filanova', 'PLA', 'High Speed', color, rollos, 0, 1000, 22000, 22000
FROM (VALUES
  ('Black',      20),
  ('White',      20),
  ('Green',       3),
  ('Grey',        6),
  ('Blue',        6),
  ('Taro Purple', 6),
  ('Yellow',      3)
) AS t(color, rollos)
WHERE NOT EXISTS (
  SELECT 1 FROM filamentos
  WHERE marca = 'Filanova' AND material = 'PLA' AND tipo = 'High Speed'
    AND filamentos.color = t.color
);

-- ── Filanova PETG High Speed ($22.000/kg) ─────────────────────────────────────

UPDATE filamentos SET costo_kg = 22000, precio_kg = 22000, updated_at = now()
WHERE marca = 'Filanova' AND material = 'PETG' AND tipo = 'High Speed';

INSERT INTO filamentos (nombre, marca, material, tipo, color, rollos_cerrados, gramos_sueltos, peso_rollo_gr, costo_kg, precio_kg)
SELECT 'PETG HS', 'Filanova', 'PETG', 'High Speed', color, rollos, 0, 1000, 22000, 22000
FROM (VALUES
  ('Black', 15),
  ('White', 15)
) AS t(color, rollos)
WHERE NOT EXISTS (
  SELECT 1 FROM filamentos
  WHERE marca = 'Filanova' AND material = 'PETG' AND tipo = 'High Speed'
    AND filamentos.color = t.color
);

-- ── GST3D Cosmos PLA+ SILK ($26.500/kg) ──────────────────────────────────────

UPDATE filamentos SET costo_kg = 26500, precio_kg = 26500, updated_at = now()
WHERE marca = 'GST3D' AND nombre ILIKE '%Cosmos%';

INSERT INTO filamentos (nombre, marca, material, tipo, color, rollos_cerrados, gramos_sueltos, peso_rollo_gr, costo_kg, precio_kg)
SELECT 'Cosmos PLA+ SILK HS', 'GST3D', 'PLA', 'Silk', 'Gold', 1, 0, 1000, 26500, 26500
WHERE NOT EXISTS (
  SELECT 1 FROM filamentos WHERE marca = 'GST3D' AND nombre ILIKE '%Cosmos%' AND color ILIKE '%Gold%'
);

-- ── Toolbox PLA+ Marble ($34.000/kg) ─────────────────────────────────────────

UPDATE filamentos SET costo_kg = 34000, precio_kg = 34000, updated_at = now()
WHERE marca = 'Toolbox' AND nombre ILIKE '%Marble%';

INSERT INTO filamentos (nombre, marca, material, tipo, color, rollos_cerrados, gramos_sueltos, peso_rollo_gr, costo_kg, precio_kg)
SELECT 'PLA+ Marble HS', 'Toolbox', 'PLA', 'High Speed', color, rollos, 0, 1000, 34000, 34000
FROM (VALUES
  ('Brick',  2),
  ('Cement', 1),
  ('Marble', 1),
  ('Wood',   1)
) AS t(color, rollos)
WHERE NOT EXISTS (
  SELECT 1 FROM filamentos
  WHERE marca = 'Toolbox' AND nombre ILIKE '%Marble%'
    AND filamentos.color = t.color
);

-- ── Toolbox PETG Fibra Carbono ($44.000/kg) ───────────────────────────────────

UPDATE filamentos SET costo_kg = 44000, precio_kg = 44000, updated_at = now()
WHERE marca = 'Toolbox' AND nombre ILIKE '%Carbono%';

INSERT INTO filamentos (nombre, marca, material, tipo, color, rollos_cerrados, gramos_sueltos, peso_rollo_gr, costo_kg, precio_kg)
SELECT 'PETG Fibra Carbono HS', 'Toolbox', 'PETG', 'High Speed', 'Black', 2, 0, 1000, 44000, 44000
WHERE NOT EXISTS (
  SELECT 1 FROM filamentos WHERE marca = 'Toolbox' AND nombre ILIKE '%Carbono%' AND color ILIKE '%Black%'
);

-- ── Toolbox PETG HS ($22.000/kg) ──────────────────────────────────────────────

UPDATE filamentos SET costo_kg = 22000, precio_kg = 22000, updated_at = now()
WHERE marca = 'Toolbox' AND material = 'PETG' AND tipo = 'High Speed' AND nombre NOT ILIKE '%Carbono%';

INSERT INTO filamentos (nombre, marca, material, tipo, color, rollos_cerrados, gramos_sueltos, peso_rollo_gr, costo_kg, precio_kg)
SELECT 'PETG HS', 'Toolbox', 'PETG', 'High Speed', color, rollos, 0, 1000, 22000, 22000
FROM (VALUES
  ('Latte',  2),
  ('Yellow', 3)
) AS t(color, rollos)
WHERE NOT EXISTS (
  SELECT 1 FROM filamentos
  WHERE marca = 'Toolbox' AND material = 'PETG' AND tipo = 'High Speed'
    AND nombre NOT ILIKE '%Carbono%'
    AND filamentos.color = t.color
);

-- ── Toolbox PLA+ SILK ($26.500/kg) ────────────────────────────────────────────

UPDATE filamentos SET costo_kg = 26500, precio_kg = 26500, updated_at = now()
WHERE marca = 'Toolbox' AND nombre ILIKE '%SILK%';

INSERT INTO filamentos (nombre, marca, material, tipo, color, rollos_cerrados, gramos_sueltos, peso_rollo_gr, costo_kg, precio_kg)
SELECT 'PLA+ SILK HS', 'Toolbox', 'PLA', 'Silk', 'Gold', 1, 0, 1000, 26500, 26500
WHERE NOT EXISTS (
  SELECT 1 FROM filamentos WHERE marca = 'Toolbox' AND nombre ILIKE '%SILK%' AND color ILIKE '%Gold%'
);
