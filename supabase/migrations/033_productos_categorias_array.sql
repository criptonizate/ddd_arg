-- Cambiar categoria (texto) por categorias (array de texto)
ALTER TABLE products ADD COLUMN IF NOT EXISTS categorias TEXT[] DEFAULT '{}';

-- Migrar datos existentes
UPDATE products SET categorias = ARRAY[categoria] WHERE categoria IS NOT NULL AND categoria != '';

-- Índice GIN para búsquedas por array contains
CREATE INDEX IF NOT EXISTS idx_products_categorias ON products USING GIN(categorias);
