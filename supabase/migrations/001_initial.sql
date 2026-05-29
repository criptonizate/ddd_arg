-- =============================================================
-- DDD ARG — Migración inicial
-- Ejecutar en Supabase SQL Editor (Project > SQL Editor > New query)
-- =============================================================

-- ─────────────────────────────────────────────
-- TABLAS
-- ─────────────────────────────────────────────

create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  descripcion   text,
  precio_base   numeric(12,2) not null default 0,
  categoria     text,
  estado        text not null default 'activo'
                check (estado in ('activo', 'pausado', 'agotado', 'archivado')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id) on delete cascade,
  nombre_variante text not null,
  precio          numeric(12,2),
  stock           int not null default 0 check (stock >= 0),
  created_at      timestamptz not null default now()
);

create table if not exists product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  url           text not null,
  storage_path  text not null,
  orden         int not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  estado           text not null default 'pendiente'
                   check (estado in ('pendiente', 'confirmado', 'listo', 'entregado', 'cancelado')),
  origen           text not null default 'tienda'
                   check (origen in ('tienda', 'manual', 'whatsapp', 'instagram')),
  metodo_pago      text check (metodo_pago in ('efectivo', 'transferencia', 'mercadopago', 'otro')),
  cliente_nombre   text,
  cliente_telefono text,
  cliente_email    text,
  entrega          text check (entrega in ('retiro', 'envio')),
  direccion_envio  text,
  nota             text,
  total            numeric(12,2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  product_id       uuid references products(id) on delete set null,
  variant_id       uuid references product_variants(id) on delete set null,
  nombre_producto  text not null,
  nombre_variante  text,
  cantidad         int not null check (cantidad > 0),
  precio_unitario  numeric(12,2) not null,
  created_at       timestamptz not null default now()
);

create table if not exists transactions (
  id           uuid primary key default gen_random_uuid(),
  tipo         text not null check (tipo in ('ingreso', 'egreso')),
  monto        numeric(12,2) not null check (monto > 0),
  descripcion  text not null,
  categoria    text check (categoria in ('venta', 'inversion', 'gasto_operativo', 'marketing', 'envio', 'otro')),
  order_id     uuid references orders(id) on delete set null,
  fecha        timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────

create index if not exists idx_product_variants_product_id on product_variants(product_id);
create index if not exists idx_product_images_product_id on product_images(product_id);
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_orders_estado on orders(estado);
create index if not exists idx_orders_created_at on orders(created_at desc);
create index if not exists idx_transactions_tipo on transactions(tipo);
create index if not exists idx_transactions_fecha on transactions(fecha desc);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table products         enable row level security;
alter table product_variants enable row level security;
alter table product_images   enable row level security;
alter table orders           enable row level security;
alter table order_items      enable row level security;
alter table transactions     enable row level security;

-- Productos: lectura pública para productos activos
create policy "Lectura pública de productos activos"
  on products for select
  using (estado = 'activo');

create policy "Lectura pública de variantes de productos activos"
  on product_variants for select
  using (
    exists (
      select 1 from products p
      where p.id = product_id and p.estado = 'activo'
    )
  );

create policy "Lectura pública de imágenes de productos activos"
  on product_images for select
  using (
    exists (
      select 1 from products p
      where p.id = product_id and p.estado = 'activo'
    )
  );

-- Pedidos: inserción pública desde la tienda
create policy "Inserción pública de pedidos desde tienda"
  on orders for insert
  with check (origen in ('tienda', 'whatsapp'));

create policy "Inserción pública de items de pedidos"
  on order_items for insert
  with check (
    exists (
      select 1 from orders o
      where o.id = order_id and o.origen in ('tienda', 'whatsapp')
    )
  );

-- Nota: el service_role key bypasea RLS para todas las operaciones de admin.

-- ─────────────────────────────────────────────
-- STORAGE: bucket "productos"
-- ─────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'productos',
  'productos',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Lectura pública del bucket (las URLs son públicas)
create policy "Lectura pública de imágenes"
  on storage.objects for select
  using (bucket_id = 'productos');

-- ─────────────────────────────────────────────
-- FUNCIÓN: crear_venta_manual
-- Crea una venta desde el panel admin de forma transaccional:
-- inserta order + order_items, descuenta stock, registra ingreso.
-- ─────────────────────────────────────────────

create or replace function crear_venta_manual(
  p_cliente_nombre   text,
  p_cliente_telefono text,
  p_metodo_pago      text,
  p_nota             text,
  p_items            jsonb
  -- Formato esperado de p_items:
  -- [{"product_id":"uuid","variant_id":"uuid","nombre_producto":"...","nombre_variante":"...","cantidad":1,"precio_unitario":1000}]
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_order_id uuid;
  v_total    numeric(12,2);
  v_item     jsonb;
begin
  -- Calcular total
  select coalesce(
    sum((elem->>'precio_unitario')::numeric * (elem->>'cantidad')::int),
    0
  )
  into v_total
  from jsonb_array_elements(p_items) elem;

  -- Crear el pedido en estado "entregado" (venta directa ya cobrada)
  insert into orders (estado, origen, metodo_pago, cliente_nombre, cliente_telefono, nota, total)
  values ('entregado', 'manual', p_metodo_pago, p_cliente_nombre, p_cliente_telefono, p_nota, v_total)
  returning id into v_order_id;

  -- Insertar items y descontar stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into order_items (
      order_id, product_id, variant_id,
      nombre_producto, nombre_variante,
      cantidad, precio_unitario
    )
    values (
      v_order_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'variant_id')::uuid,
      v_item->>'nombre_producto',
      v_item->>'nombre_variante',
      (v_item->>'cantidad')::int,
      (v_item->>'precio_unitario')::numeric
    );

    -- Descontar stock (falla si no alcanza)
    update product_variants
    set stock = stock - (v_item->>'cantidad')::int
    where id = (v_item->>'variant_id')::uuid
      and stock >= (v_item->>'cantidad')::int;

    if not found then
      raise exception 'Stock insuficiente para la variante "%"',
        coalesce(v_item->>'nombre_variante', v_item->>'variant_id');
    end if;
  end loop;

  -- Registrar ingreso en transactions
  insert into transactions (tipo, monto, descripcion, categoria, order_id)
  values (
    'ingreso',
    v_total,
    'Venta manual: ' || coalesce(p_cliente_nombre, 'Sin nombre'),
    'venta',
    v_order_id
  );

  return v_order_id;
end;
$$;

-- ─────────────────────────────────────────────
-- FUNCIÓN: confirmar_pedido
-- Confirma un pedido pendiente de la tienda:
-- descuenta stock y registra el ingreso.
-- ─────────────────────────────────────────────

create or replace function confirmar_pedido(p_order_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_item   record;
  v_total  numeric(12,2);
  v_nombre text;
begin
  -- Verificar que exista y esté pendiente
  select total, cliente_nombre
  into v_total, v_nombre
  from orders
  where id = p_order_id and estado = 'pendiente';

  if not found then
    raise exception 'Pedido no encontrado o no está en estado pendiente';
  end if;

  -- Descontar stock de cada item
  for v_item in
    select oi.variant_id, oi.cantidad, oi.nombre_variante
    from order_items oi
    where oi.order_id = p_order_id
      and oi.variant_id is not null
  loop
    update product_variants
    set stock = stock - v_item.cantidad
    where id = v_item.variant_id
      and stock >= v_item.cantidad;

    if not found then
      raise exception 'Stock insuficiente para "%"', v_item.nombre_variante;
    end if;
  end loop;

  -- Actualizar estado del pedido
  update orders
  set estado = 'confirmado', updated_at = now()
  where id = p_order_id;

  -- Registrar ingreso
  insert into transactions (tipo, monto, descripcion, categoria, order_id)
  values (
    'ingreso',
    v_total,
    'Pedido confirmado: ' || coalesce(v_nombre, 'Sin nombre'),
    'venta',
    p_order_id
  );
end;
$$;

-- ─────────────────────────────────────────────
-- FUNCIÓN: cancelar_pedido
-- Cancela un pedido. Si ya estaba confirmado o listo,
-- restaura el stock y elimina la transacción de ingreso.
-- ─────────────────────────────────────────────

create or replace function cancelar_pedido(p_order_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_estado text;
  v_item   record;
begin
  select estado into v_estado
  from orders
  where id = p_order_id;

  if v_estado is null then
    raise exception 'Pedido no encontrado';
  end if;

  if v_estado = 'cancelado' then
    raise exception 'El pedido ya está cancelado';
  end if;

  -- Si el stock ya fue descontado (confirmado o listo), hay que restaurarlo
  if v_estado in ('confirmado', 'listo') then
    for v_item in
      select oi.variant_id, oi.cantidad
      from order_items oi
      where oi.order_id = p_order_id
        and oi.variant_id is not null
    loop
      update product_variants
      set stock = stock + v_item.cantidad
      where id = v_item.variant_id;
    end loop;

    -- Eliminar la transacción de ingreso asociada
    delete from transactions
    where order_id = p_order_id and tipo = 'ingreso';
  end if;

  -- Cancelar el pedido
  update orders
  set estado = 'cancelado', updated_at = now()
  where id = p_order_id;
end;
$$;

-- ─────────────────────────────────────────────
-- TRIGGER: actualizar updated_at automáticamente
-- ─────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

create trigger trg_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();
