'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { PUNTOS_POR_CANJE, PESOS_POR_CANJE } from '@/lib/ddd-coins-helpers'
import { isAnyAdmin } from '@/lib/admin-roles'

// ─── Helpers de autorización ────────────────────────────────────────────────
// Todas las funciones de este archivo son `'use server'`, es decir, endpoints
// POST invocables por cualquier cliente autenticado. Hay que validar que el
// caller esté autorizado a tocar los coins de `userId` / `pedidoId`.

async function requireSelfOrAdmin(userId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  if (user.id === userId) return
  if (isAnyAdmin(user.email)) return
  throw new Error('No autorizado')
}

async function requireAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAnyAdmin(user.email)) throw new Error('No autorizado')
}

async function requireOwnerOrAdminDePedido(pedidoId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  if (isAnyAdmin(user.email)) return
  const db = createServiceClient()
  const { data: p } = await db
    .from('filamento_pedidos')
    .select('user_id')
    .eq('id', pedidoId)
    .maybeSingle()
  if (!p || p.user_id !== user.id) throw new Error('No autorizado')
}

// ─── Lecturas ───────────────────────────────────────────────────────────────

export async function getSaldoCoins(userId: string): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Solo el dueño o un admin pueden leer el saldo. Sin sesión → 0.
  if (!user) return 0
  if (user.id !== userId && !isAnyAdmin(user.email)) return 0

  const db = createServiceClient()
  const { data } = await db.rpc('get_saldo_coins', { p_user_id: userId })
  return (data as number | null) ?? 0
}

export async function getHistorialCoins(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  if (user.id !== userId && !isAnyAdmin(user.email)) return []

  const db = createServiceClient()
  const { data } = await db
    .from('ddd_coins')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  return data ?? []
}

// ─── Login diario ───────────────────────────────────────────────────────────

// Devuelve la fecha ('YYYY-MM-DD') en zona horaria Argentina para un Date dado.
// Robusto a cambios de DST (que hoy no aplican en AR pero cerraría el flanco
// si vuelven en el futuro). No depende del offset del server.
function dateAR(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

export async function registrarLoginDiario(): Promise<{ ganados: number; racha: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ganados: 0, racha: 0 }

  const db = createServiceClient()
  const now = Date.now()
  const hoy  = dateAR(new Date(now))
  const ayer = dateAR(new Date(now - 86400000))

  const { data: loginRow } = await db
    .from('ddd_coins_login')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  // Si no existe la fila es la PRIMERA vez que este usuario entra autenticado.
  // Notificamos al admin por Telegram — señal de "nuevo cliente registrado".
  if (!loginRow) {
    void (async () => {
      const { notifyAdmin } = await import('@/lib/telegram')
      const nombre = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Cliente'
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ddd-arg.vercel.app'
      await notifyAdmin({
        emoji: '👤',
        titulo: 'Cliente nuevo registrado',
        detalle: [
          `${nombre}`,
          `${user.email ?? '—'}`,
          user.user_metadata?.full_name ? '(con Google)' : null,
        ].filter(Boolean).join('\n'),
        url: `${siteUrl}/admin/clientes`,
      })
    })()
  }

  const rachaPrevia = loginRow?.racha_dias ?? 0
  if (loginRow?.last_login_date === hoy) return { ganados: 0, racha: rachaPrevia }
  const racha = loginRow?.last_login_date === ayer ? (rachaPrevia + 1) : 1

  await db.from('ddd_coins_login').upsert({
    user_id: user.id,
    last_login_date: hoy,
    racha_dias: racha,
    updated_at: new Date().toISOString(),
  })

  const puntosTransacciones: { puntos: number; motivo: string }[] = [
    { puntos: 5, motivo: 'login_diario' },
  ]
  if (racha === 7)  puntosTransacciones.push({ puntos: 30, motivo: 'racha_7' })
  if (racha === 14) puntosTransacciones.push({ puntos: 75, motivo: 'racha_14' })
  if (racha === 30) puntosTransacciones.push({ puntos: 200, motivo: 'racha_30' })

  // Insert fila por fila para que un 23505 de una (doble-click → duplicado
  // de login_diario) no haga abortar todo el batch. Los unique partial indexes
  // creados en la migración 067 garantizan idempotencia para login_diario y
  // racha_*.
  let ganados = 0
  for (const t of puntosTransacciones) {
    const { error } = await db.from('ddd_coins').insert({ user_id: user.id, ...t })
    if (error) {
      if (error.code !== '23505') throw error
    } else {
      ganados += t.puntos
    }
  }

  // Sumar 50 pts de membresía activa (una vez por mes, idempotente a nivel DB)
  // Verificación barata: si compró 5+ kg en los últimos 30 días tiene membresía.
  // Preferimos confirmado_at (estable) a updated_at (mutable); si confirmado_at
  // es NULL (backfill no completado o pedido viejo), caemos a updated_at.
  try {
    const { data: pedidosRecientes } = await db
      .from('filamento_pedidos')
      .select('total_rollos, confirmado_at, updated_at')
      .eq('user_id', user.id)
      .in('estado', ['confirmado', 'entregado'])
    const hace30Dias = now - 30 * 86400000
    const kgRecientes = (pedidosRecientes ?? []).reduce(
      (s: number, p: { total_rollos: number | null; confirmado_at: string | null; updated_at: string }) => {
        const fecha = new Date(p.confirmado_at ?? p.updated_at).getTime()
        return fecha >= hace30Dias ? s + (p.total_rollos ?? 0) : s
      },
      0,
    )
    if (kgRecientes >= 5) await sumarPuntosMembresiaActiva(user.id)
  } catch {}

  return { ganados, racha }
}

// ─── Mutaciones (todas con guard explícito) ─────────────────────────────────

export async function sumarPuntosPorCompra(
  userId: string,
  rollos: number,
  ref: { pedidoId: string } | { ventaId: string },
): Promise<void> {
  await requireSelfOrAdmin(userId)
  if (rollos <= 0) return
  const db = createServiceClient()

  const isPedido = 'pedidoId' in ref
  const refColumn = isPedido ? 'pedido_id' : 'venta_id'
  const refValue  = isPedido ? ref.pedidoId : ref.ventaId

  // Idempotencia: si ya hay puntos "compra" para esta referencia, no duplicar.
  const { count } = await db
    .from('ddd_coins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq(refColumn, refValue)
    .eq('motivo', 'compra')
  if ((count ?? 0) > 0) return

  // 10 pts/kg. `rollos` puede venir fraccional desde ventas locales (gramos/1000),
  // así que floor para no redondear hacia arriba y quedar por arriba del backfill.
  const puntos = Math.floor(rollos * 10)
  if (puntos <= 0) return

  const row: Record<string, unknown> = {
    user_id: userId,
    puntos,
    motivo: 'compra',
  }
  row[refColumn] = refValue

  const { error } = await db.from('ddd_coins').insert(row)
  // 23505 = unique_violation. El unique partial index garantiza idempotencia a
  // nivel DB; si vino por race, es "ya hecho" y lo swalloweamos.
  if (error && error.code !== '23505') throw error
}

// Revierte TODAS las filas de ddd_coins asociadas a un pedido (compra + canje).
// Se usa al cancelar/anular un pedido para no dejar puntos "gratis" ni canjes
// de puntos sin contrapartida. Autorizado para el dueño del pedido o cualquier admin.
export async function revertirCoinsDePedido(pedidoId: string): Promise<void> {
  await requireOwnerOrAdminDePedido(pedidoId)
  const db = createServiceClient()
  await db.from('ddd_coins').delete().eq('pedido_id', pedidoId)
}

// Revierte los ddd_coins asociados a una venta (local, no pedido web).
// Las ventas locales las maneja solo el admin.
export async function revertirCoinsDeVenta(ventaId: string): Promise<void> {
  await requireAdmin()
  const db = createServiceClient()
  await db.from('ddd_coins').delete().eq('venta_id', ventaId)
}

export async function sumarPuntosMembresiaActiva(userId: string): Promise<void> {
  await requireSelfOrAdmin(userId)
  const db = createServiceClient()
  // Insert directo: el unique partial index (motivo='membresia_mensual' por
  // mes ART) garantiza idempotencia. Si otra request la insertó primero,
  // 23505 y lo tragamos.
  const { error } = await db.from('ddd_coins').insert({
    user_id: userId, puntos: 50, motivo: 'membresia_mensual',
  })
  if (error && error.code !== '23505') throw error
}

export async function sumarPuntosPerfilCompleto(userId: string): Promise<void> {
  await requireSelfOrAdmin(userId)
  const db = createServiceClient()
  const { error } = await db.from('ddd_coins').insert({
    user_id: userId, puntos: 20, motivo: 'completar_perfil',
  })
  if (error && error.code !== '23505') throw error
}

export async function canjearCoinsEnPedido(
  userId: string,
  puntosACanjear: number,
  pedidoId: string,
): Promise<{ error?: string }> {
  if (puntosACanjear <= 0) return {}
  if (puntosACanjear % PUNTOS_POR_CANJE !== 0) return { error: 'Cantidad de puntos inválida' }

  // Verificar que el userId sea el del usuario autenticado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) return { error: 'No autorizado' }

  const db = createServiceClient()

  // Verificar que el pedido pertenezca al userId: evita que el cliente canjee
  // sus coins contra el pedido_id de otro usuario (IDOR parcial).
  const { data: pedido } = await db
    .from('filamento_pedidos')
    .select('user_id')
    .eq('id', pedidoId)
    .maybeSingle()
  if (!pedido || pedido.user_id !== userId) return { error: 'Pedido no encontrado' }

  // Idempotencia: si ya hay un canje registrado para este pedido, no duplicar
  const { count: canjesExistentes } = await db
    .from('ddd_coins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('pedido_id', pedidoId)
    .eq('motivo', 'canje_pedido')
  if ((canjesExistentes ?? 0) > 0) return {}

  // Verificar saldo via RPC (más barato que sumar en memoria)
  const { data: saldoData } = await db.rpc('get_saldo_coins', { p_user_id: userId })
  const saldo = (saldoData as number | null) ?? 0
  if (saldo < puntosACanjear) return { error: 'No tenés suficientes DDD Coins' }

  const { error } = await db.from('ddd_coins').insert({
    user_id: userId,
    puntos: -puntosACanjear,
    motivo: 'canje_pedido',
    pedido_id: pedidoId,
  })
  // Si otra request concurrente ya grabó el canje, no duplicamos (unique index).
  if (error && error.code !== '23505') return { error: error.message }
  return {}
}
