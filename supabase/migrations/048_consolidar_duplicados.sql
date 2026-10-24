-- Consolida duplicados generados por la migración 046.
-- Estrategia: redirigir reservas al registro viejo, actualizar stock+nombre+tipo, borrar el nuevo.

-- ── Filanova PETG Black (0 + 15 = 15) ────────────────────────────────────────
UPDATE filamento_reservas SET filamento_id = '41b40b82-0ce4-4e4a-b85f-76c42445901c' WHERE filamento_id = '80516320-dff5-486a-a3ff-5a79fc6e4752';
UPDATE filamentos SET nombre = 'PETG HS', tipo = 'High Speed', rollos_cerrados = 0 + 15, precio_kg = 22000, updated_at = now() WHERE id = '41b40b82-0ce4-4e4a-b85f-76c42445901c';
DELETE FROM filamentos WHERE id = '80516320-dff5-486a-a3ff-5a79fc6e4752';

-- ── Filanova PETG White (0 + 15 = 15) ────────────────────────────────────────
UPDATE filamento_reservas SET filamento_id = 'fec5c44d-79d2-4e1d-b585-8b5bd7f336d1' WHERE filamento_id = '5d133f2f-79e6-4afb-bb50-2de31b94c4b2';
UPDATE filamentos SET nombre = 'PETG HS', tipo = 'High Speed', rollos_cerrados = 0 + 15, precio_kg = 22000, updated_at = now() WHERE id = 'fec5c44d-79d2-4e1d-b585-8b5bd7f336d1';
DELETE FROM filamentos WHERE id = '5d133f2f-79e6-4afb-bb50-2de31b94c4b2';

-- ── Filanova PLA Black (7 + 20 = 27) ─────────────────────────────────────────
UPDATE filamento_reservas SET filamento_id = 'f8dbd734-2be8-4638-9642-d74448a1daca' WHERE filamento_id = '6e00e9ad-8fd8-4c68-bc7b-abfaa93587aa';
UPDATE filamentos SET nombre = 'PLA+ Chroma HS', tipo = 'High Speed', rollos_cerrados = 7 + 20, precio_kg = 22000, updated_at = now() WHERE id = 'f8dbd734-2be8-4638-9642-d74448a1daca';
DELETE FROM filamentos WHERE id = '6e00e9ad-8fd8-4c68-bc7b-abfaa93587aa';

-- ── Filanova PLA Blue (0 + 5 = 5) ────────────────────────────────────────────
UPDATE filamento_reservas SET filamento_id = 'b756741c-ad2d-47b0-b195-5fab9767924f' WHERE filamento_id = 'cec5b503-9925-41ce-8f31-1324f38eaf40';
UPDATE filamentos SET nombre = 'PLA+ Chroma HS', tipo = 'High Speed', rollos_cerrados = 0 + 5, precio_kg = 22000, updated_at = now() WHERE id = 'b756741c-ad2d-47b0-b195-5fab9767924f';
DELETE FROM filamentos WHERE id = 'cec5b503-9925-41ce-8f31-1324f38eaf40';

-- ── Filanova PLA Green (4 + 3 = 7) ───────────────────────────────────────────
UPDATE filamento_reservas SET filamento_id = 'e4a8e352-a5bf-425d-af9b-795fda968813' WHERE filamento_id = '473d4df0-0c56-4718-8abe-5d6ecf1d0e28';
UPDATE filamentos SET nombre = 'PLA+ Chroma HS', tipo = 'High Speed', rollos_cerrados = 4 + 3, precio_kg = 22000, updated_at = now() WHERE id = 'e4a8e352-a5bf-425d-af9b-795fda968813';
DELETE FROM filamentos WHERE id = '473d4df0-0c56-4718-8abe-5d6ecf1d0e28';

-- ── Filanova PLA Grey (1 + 6 = 7 rollos + conserva 1000g sueltos) ────────────
UPDATE filamento_reservas SET filamento_id = '7d414bc4-4d14-4c93-b9ba-026a7708051b' WHERE filamento_id = '7c6c4199-a009-4efc-892f-423df83b7486';
UPDATE filamentos SET nombre = 'PLA+ Chroma HS', tipo = 'High Speed', rollos_cerrados = 1 + 6, precio_kg = 22000, updated_at = now() WHERE id = '7d414bc4-4d14-4c93-b9ba-026a7708051b';
DELETE FROM filamentos WHERE id = '7c6c4199-a009-4efc-892f-423df83b7486';

-- ── Filanova PLA Taro Purple (2 + 6 = 8) ─────────────────────────────────────
UPDATE filamento_reservas SET filamento_id = '667df6f8-67a2-4ad1-adcd-309451a68fe5' WHERE filamento_id = '21b1e4c2-7037-434a-a828-a1279f759f8c';
UPDATE filamentos SET nombre = 'PLA+ Chroma HS', tipo = 'High Speed', rollos_cerrados = 2 + 6, precio_kg = 22000, updated_at = now() WHERE id = '667df6f8-67a2-4ad1-adcd-309451a68fe5';
DELETE FROM filamentos WHERE id = '21b1e4c2-7037-434a-a828-a1279f759f8c';

-- ── Filanova PLA White (0 + 20 = 20) ─────────────────────────────────────────
UPDATE filamento_reservas SET filamento_id = '053f0eea-059b-4a68-aad9-e841cb72eae8' WHERE filamento_id = '681dbbd8-ad5b-4a39-b29c-d249a2d02b30';
UPDATE filamentos SET nombre = 'PLA+ Chroma HS', tipo = 'High Speed', rollos_cerrados = 0 + 20, precio_kg = 22000, updated_at = now() WHERE id = '053f0eea-059b-4a68-aad9-e841cb72eae8';
DELETE FROM filamentos WHERE id = '681dbbd8-ad5b-4a39-b29c-d249a2d02b30';

-- ── Filanova PLA Yellow (4 + 3 = 7) ──────────────────────────────────────────
UPDATE filamento_reservas SET filamento_id = '5688a48a-3679-4104-85b8-47a0effb5c8c' WHERE filamento_id = 'e50ce3ae-92ec-4157-a235-2377178f6a51';
UPDATE filamentos SET nombre = 'PLA+ Chroma HS', tipo = 'High Speed', rollos_cerrados = 4 + 3, precio_kg = 22000, updated_at = now() WHERE id = '5688a48a-3679-4104-85b8-47a0effb5c8c';
DELETE FROM filamentos WHERE id = 'e50ce3ae-92ec-4157-a235-2377178f6a51';
