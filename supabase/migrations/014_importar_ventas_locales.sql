-- IMPORTANTE: Correr DESPUÉS de la migration 012 (que agrega estado 'local')
-- Importar ventas locales históricas

DO $$
DECLARE v_id uuid;
BEGIN

-- 1. Adrian ViewTV — 31 escarapelas
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Adrian ViewTV','retiro',45000,45000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapelas personalizadas',31,ROUND(45000.0/31,2));
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',45000,'Venta local: Adrian ViewTV','venta',v_id);

-- 2. Miguel ViewTv — 8 escarapelas
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Miguel ViewTv','retiro',12000,12000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapelas personalizadas',8,1500);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',12000,'Venta local: Miguel ViewTv','venta',v_id);

-- 3. Miguel ViewTv — 1 escarapela simple
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Miguel ViewTv','retiro',1000,1000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapela simple',1,1000);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',1000,'Venta local: Miguel ViewTv','venta',v_id);

-- 4. Alejandra Sasha — 30 escarapelas simples
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Alejandra Sasha','retiro',20000,20000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapela simple',30,ROUND(20000.0/30,2));
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',20000,'Venta local: Alejandra Sasha','venta',v_id);

-- 5. Alejandra Sasha — 60 Logo Charo regalos
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Alejandra Sasha','retiro',27000,27000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Logo Charo regalos',60,450);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',27000,'Venta local: Alejandra Sasha','venta',v_id);

-- 6. Nadia Jimena Zarate — 12 escarapelas (pagó $9.000 de $18.000)
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Nadia Jimena Zarate','retiro',18000,9000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapelas personalizadas',12,1500);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',9000,'Venta local: Nadia Jimena Zarate','venta',v_id);

-- 7. Rodri Rodeo — 22 escarapelas
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Rodri Rodeo','retiro',33000,33000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapelas personalizadas',22,1500);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',33000,'Venta local: Rodri Rodeo','venta',v_id);

-- 8. Elsa Marta — 2 escarapelas
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Elsa Marta','retiro',4000,4000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapelas personalizadas',2,2000);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',4000,'Venta local: Elsa Marta','venta',v_id);

-- 9. Diego De la Vega — 4 escarapelas
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Diego De la Vega','retiro',8000,8000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapelas personalizadas',4,2000);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',8000,'Venta local: Diego De la Vega','venta',v_id);

-- 10. Miguel ViewTv — 4 escarapelas
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Miguel ViewTv','retiro',8000,8000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapelas personalizadas',4,2000);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',8000,'Venta local: Miguel ViewTv','venta',v_id);

-- 11. Jorge Contreras — 13 escarapelas
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Jorge Contreras','retiro',19500,19500) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapelas personalizadas',13,1500);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',19500,'Venta local: Jorge Contreras','venta',v_id);

-- 12. Adrian ViewTV — 1 escarapela
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Adrian ViewTV','retiro',1452,1452) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapelas personalizadas',1,1452);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',1452,'Venta local: Adrian ViewTV','venta',v_id);

-- 13. Zjz Descartables — 1 escarapela
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Zjz Descartables','retiro',2000,2000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapelas personalizadas',1,2000);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',2000,'Venta local: Zjz Descartables','venta',v_id);

-- 14. Jorge Contreras — 26 escarapelas
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Jorge Contreras','retiro',39000,39000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapelas personalizadas',26,1500);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',39000,'Venta local: Jorge Contreras','venta',v_id);

-- 15. Alejandra Sasha — 40 Logo Charo regalos
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Alejandra Sasha','retiro',10000,10000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Logo Charo regalos',40,250);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',10000,'Venta local: Alejandra Sasha','venta',v_id);

-- 16. Alejandra Sasha — 1 Logo Charo regalos
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Alejandra Sasha','retiro',6000,6000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Logo Charo regalos',1,6000);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',6000,'Venta local: Alejandra Sasha','venta',v_id);

-- 17. Ezequiel Oliva — 200 escarapelas
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Ezequiel Oliva','retiro',240000,240000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Escarapelas personalizadas',200,1200);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',240000,'Venta local: Ezequiel Oliva','venta',v_id);

-- 18. Angeles Romero — 2 soportes de casco
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Angeles Romero','retiro',7500,7500) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, cantidad, precio_unitario)
VALUES (v_id,'Soporte Casco',2,3750);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',7500,'Venta local: Angeles Romero','venta',v_id);

-- 19. Lili Zalazar — 1 Caja figuritas Fucsia (sin cobrar)
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Lili Zalazar','retiro',5000,0) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, nombre_variante, cantidad, precio_unitario)
VALUES (v_id,'Caja figuritas','Fucsia',1,5000);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',0,'Venta local: Lili Zalazar','venta',v_id);

-- 20. Maxima (SCJ) — 1 Caja figuritas Fucsia (sin cobrar)
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Maxima (SCJ)','retiro',5000,0) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, nombre_variante, cantidad, precio_unitario)
VALUES (v_id,'Caja figuritas','Fucsia',1,5000);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',0,'Venta local: Maxima (SCJ)','venta',v_id);

-- 21. Belen — 1 Caja figuritas Negro
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Belen','retiro',5000,5000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, nombre_variante, cantidad, precio_unitario)
VALUES (v_id,'Caja figuritas','Negro',1,5000);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',5000,'Venta local: Belen','venta',v_id);

-- 22. Belen — 1 Caja figuritas Celeste
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Belen','retiro',5000,5000) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, nombre_variante, cantidad, precio_unitario)
VALUES (v_id,'Caja figuritas','Celeste',1,5000);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',5000,'Venta local: Belen','venta',v_id);

-- 23. Lili Zalazar — 2 Caja figuritas Celeste (sin cobrar)
INSERT INTO orders (estado, origen, metodo_pago, cliente_nombre, entrega, total, sena)
VALUES ('local','manual','efectivo','Lili Zalazar','retiro',10000,0) RETURNING id INTO v_id;
INSERT INTO order_items (order_id, nombre_producto, nombre_variante, cantidad, precio_unitario)
VALUES (v_id,'Caja figuritas','Celeste',2,5000);
INSERT INTO transactions (tipo,monto,descripcion,categoria,order_id)
VALUES ('ingreso',0,'Venta local: Lili Zalazar','venta',v_id);

-- Linkear clientes existentes a los pedidos recién insertados
UPDATE orders o
SET cliente_id = c.id
FROM clientes c
WHERE o.cliente_id IS NULL
  AND LOWER(TRIM(o.cliente_nombre)) = LOWER(c.nombre);

END;
$$;
