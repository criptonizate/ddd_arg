-- =============================================================
-- DDD ARG — Seed de productos iniciales
-- Fuente: publicaciones de @ddd_arg en Instagram
-- Ejecutar en Supabase SQL Editor luego de 001_initial.sql
-- =============================================================

DO $$
DECLARE
  id_incredibox  uuid := gen_random_uuid();
  id_helado      uuid := gen_random_uuid();
  id_escarapelas uuid := gen_random_uuid();
  id_labubu      uuid := gen_random_uuid();
  id_kpop        uuid := gen_random_uuid();
BEGIN

-- ── Productos ──────────────────────────────────────────────────────────────

INSERT INTO products (id, nombre, descripcion, precio_base, categoria, estado) VALUES

  (
    id_incredibox,
    'Personajes Incredibox',
    'Los personajes más cancheros de Incredibox, impresos en 3D con todo el detalle. Personalizables en los colores que quieras para que queden perfectos en tu setup gamer o en tu estante. El regalo ideal para cualquier fanático del juego que quiera tener a su "crew" musical siempre a la vista.',
    3000,
    'Figuras',
    'activo'
  ),

  (
    id_helado,
    'Adorno Helado Derretido',
    'Un helado derretido que desafía la gravedad y decora tus espacios con pura originalidad. Elegí tu "sabor" favorito. Ideal para sorprender a los amantes de lo dulce y de lo diferente con un regalo único que nadie más tiene.',
    8000,
    'Decoración',
    'activo'
  ),

  (
    id_escarapelas,
    'Escarapelas Argentinas',
    'Llevá los colores de Argentina a todos lados. Escarapelas hechas con detalle y calidad para que luzcan increíbles en tu ropa, mochila o donde quieras demostrar tu orgullo argentino. Ideales para fechas patrias, actos escolares o para regalar.',
    1000,
    'Accesorios',
    'activo'
  ),

  (
    id_labubu,
    'Llavero Labubu',
    'Sumá ternura a tus llaves con nuestros llaveros de Labubu impresos en 3D. Adorables personajes con un nivel de detalle increíble. Podés elegir el color que más te guste para que sea único. El autorregalo perfecto o un detalle especial para sorprender a alguien.',
    2000,
    'Llaveros',
    'activo'
  ),

  (
    id_kpop,
    'Llaveros K-Pop',
    'Tené con vos a Rumi, Mira y Zoey. Diseñadas con todo el detalle para que luzcan increíbles en tus llaves o mochila. El regalo ideal para cualquier fan que quiera demostrar su amor con un accesorio único y resistente.',
    2000,
    'Llaveros',
    'activo'
  );

-- ── Variantes ──────────────────────────────────────────────────────────────

-- Incredibox: precio fijo, color a elección por MD
INSERT INTO product_variants (product_id, nombre_variante, precio, stock) VALUES
  (id_incredibox, 'Color a elección', NULL, 10);

-- Helado: precio fijo, "sabor" (color) a elección por MD
INSERT INTO product_variants (product_id, nombre_variante, precio, stock) VALUES
  (id_helado, 'Color a elección', NULL, 5);

-- Escarapelas: dos variantes con precios distintos
INSERT INTO product_variants (product_id, nombre_variante, precio, stock) VALUES
  (id_escarapelas, 'Simple',                    1000, 30),
  (id_escarapelas, 'Personalizada (con nombre)', 2000, 30);

-- Labubu: precio fijo, color a elección por MD
INSERT INTO product_variants (product_id, nombre_variante, precio, stock) VALUES
  (id_labubu, 'Color a elección', NULL, 15);

-- K-Pop: unitario por personaje o combo
INSERT INTO product_variants (product_id, nombre_variante, precio, stock) VALUES
  (id_kpop, 'Rumi',                         2000, 10),
  (id_kpop, 'Mira',                         2000, 10),
  (id_kpop, 'Zoey',                         2000, 10),
  (id_kpop, 'Combo 3 (Rumi + Mira + Zoey)', 5000,  5);

END $$;
