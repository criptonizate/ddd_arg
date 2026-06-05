-- Índices de performance + función RPC para stock bajo

-- order_items: frecuentemente filtrado por product_id y variant_id
CREATE INDEX IF NOT EXISTS idx_order_items_product_id  ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id  ON order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id    ON order_items(order_id);

-- product_variants: búsqueda de stock bajo (evita full scan en getDashboardStats)
CREATE INDEX IF NOT EXISTS idx_product_variants_stock        ON product_variants(stock);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id   ON product_variants(product_id);

-- clientes: búsqueda por nombre (ilike en searchClientes y findOrCreateCliente)
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(lower(nombre));

-- negocio_egresos: filtrado frecuente por negocio_id
CREATE INDEX IF NOT EXISTS idx_negocio_egresos_negocio_id ON negocio_egresos(negocio_id);

-- negocio_pedidos: joins y filtros por negocio + estado entrega
CREATE INDEX IF NOT EXISTS idx_negocio_pedidos_negocio_id    ON negocio_pedidos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_negocio_pedidos_entregado_at  ON negocio_pedidos(entregado_at);

-- transactions: filtros por fecha y tipo (usados en finanzas y dashboard)
CREATE INDEX IF NOT EXISTS idx_transactions_fecha ON transactions(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_tipo  ON transactions(tipo);

-- orders: cliente_id (para la página de detalle de cliente)
CREATE INDEX IF NOT EXISTS idx_orders_cliente_id ON orders(cliente_id) WHERE cliente_id IS NOT NULL;

-- get_stock_bajo() movida a 016_product_variants_columns.sql
-- (requiere columnas stock_minimo/color/tamaño que se agregan en esa migración)
