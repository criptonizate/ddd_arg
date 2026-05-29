# DDD ARG — Tienda + Panel Admin

Plataforma de e-commerce para una marca de impresión 3D. Incluye tienda pública con carrito y checkout por WhatsApp, y panel de administración privado con gestión de productos, ventas, stock y finanzas.

**Stack**: Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase · Recharts

---

## Inicio rápido

```bash
npm install
cp .env.example .env.local
# completar .env.local con tus credenciales
npm run dev
```

> Antes de correr la app necesitás completar la configuración de Supabase y configurar Google OAuth (ver secciones siguientes).

---

## 1. Crear proyecto en Supabase

1. Entrar a [supabase.com](https://supabase.com) y crear un nuevo proyecto.
2. Ir a **Project Settings > API** y copiar:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Ejecutar la migración SQL

1. En el Dashboard de Supabase ir a **SQL Editor > New query**.
2. Pegar el contenido de `supabase/migrations/001_initial.sql` y ejecutar.

Esto crea:
- Tablas: `products`, `product_variants`, `product_images`, `orders`, `order_items`, `transactions`
- Índices de performance
- Políticas RLS (lectura pública de productos, inserción pública de pedidos)
- Storage bucket `productos` (público, límite 5 MB, imágenes)
- Funciones transaccionales: `crear_venta_manual`, `confirmar_pedido`, `cancelar_pedido`
- Triggers `updated_at` automáticos

---

## 3. Configurar Google OAuth

1. En Supabase ir a **Authentication > Providers > Google** y activar.
2. Copiar la **Callback URL** que muestra Supabase (tiene la forma `https://xxxx.supabase.co/auth/v1/callback`).
3. En [Google Cloud Console](https://console.cloud.google.com):
   - Crear un proyecto (o usar uno existente).
   - Ir a **APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID**.
   - Tipo de aplicación: **Web application**.
   - Añadir en **Authorized redirect URIs**: la URL de callback de Supabase.
   - Copiar el **Client ID** y **Client Secret**.
4. Pegar Client ID y Client Secret en Supabase (**Authentication > Providers > Google**).
5. Agregar también la URL del sitio en **Authentication > URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) o tu dominio de producción.
   - Redirect URLs: `http://localhost:3000/api/auth/callback`.

---

## 4. Variables de entorno

Completar `.env.local` basándote en `.env.example`.

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada service role (solo en servidor) |
| `ADMIN_EMAIL` | Email Google con acceso al panel `/admin` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número WhatsApp sin `+` ni espacios (ej: `5491123456789`) |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio sin barra final |

### Formato del número de WhatsApp (Argentina)

```
549 + código de área SIN el 0 + número SIN el 15
```

Ejemplos:
- Celular CABA 11-1234-5678 → `5491112345678`
- Celular Córdoba 351-123-4567 → `5493511234567`

---

## 5. Resolver conflicto de página de inicio

El archivo `app/page.tsx` (generado por `create-next-app`) entra en conflicto con `app/(store)/page.tsx` porque ambos resuelven a la URL `/`. **Hay que eliminar `app/page.tsx`**:

```bash
# Windows
del app\page.tsx

# Linux / Mac
rm app/page.tsx
```

La página de inicio real de la tienda está en `app/(store)/page.tsx`.

---

## 6. Despliegue en Vercel

1. Conectar el repositorio en [vercel.com](https://vercel.com).
2. Agregar todas las variables de `.env.example` en **Project Settings > Environment Variables**.
3. En Supabase **Authentication > URL Configuration**, agregar la URL de producción de Vercel:
   - Site URL: `https://tu-app.vercel.app`
   - Redirect URLs: `https://tu-app.vercel.app/api/auth/callback`
4. Desplegar.

---

## Estructura de rutas

```
/                     → Tienda: página de inicio
/catalogo             → Catálogo con filtros y búsqueda
/producto/[id]        → Detalle de producto con selector de variante
/carrito              → Carrito y checkout (nombre, teléfono, entrega, WhatsApp)
/auth/login           → Login con Google (para admin)
/admin/dashboard      → Panel: KPIs, gráficos de ventas, alertas de stock
/admin/productos      → CRUD de productos con variantes e imágenes
/admin/ventas         → Lista y gestión de pedidos (confirmar / cancelar)
/admin/finanzas       → Ingresos, egresos, balance y exportación CSV
```

---

## Checkout WhatsApp

El flujo de compra no requiere pagos online:

1. Cliente completa el carrito y llena sus datos (nombre, teléfono, forma de entrega).
2. Se crea un pedido en la base de datos con estado `pendiente`.
3. Se abre WhatsApp con un mensaje preformateado con todos los productos, total y datos del cliente.
4. El admin confirma el pedido desde el panel (`/admin/ventas`), lo que descuenta el stock y registra el ingreso.

---

## Fase 2: Mercado Pago (opcional)

Las variables están reservadas en `.env.example`. Cuando estés listo:

1. Activar `NEXT_PUBLIC_ENABLE_MERCADOPAGO=true`
2. Implementar `app/api/mercadopago/checkout/route.ts` (crea preferencia de pago)
3. Implementar `app/api/mercadopago/webhook/route.ts` (confirma el pago automáticamente)

---

## Base de datos — modelo de datos

| Tabla | Descripción |
|---|---|
| `products` | Productos con precio base, categoría y estado |
| `product_variants` | Variantes con nombre, precio opcional y stock |
| `product_images` | Imágenes en Supabase Storage |
| `orders` | Pedidos (tienda, manual, WhatsApp) |
| `order_items` | Items del pedido con precio snapshot |
| `transactions` | Ingresos y egresos (el balance se calcula desde acá) |

### Funciones SQL

| Función | Acción |
|---|---|
| `crear_venta_manual(...)` | Crea venta, descuenta stock y registra ingreso en una transacción |
| `confirmar_pedido(order_id)` | Confirma pedido pendiente, descuenta stock y registra ingreso |
| `cancelar_pedido(order_id)` | Cancela pedido; si estaba confirmado, restaura stock y elimina el ingreso |
