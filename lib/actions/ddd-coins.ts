'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { PUNTOS_POR_CANJE, PESOS_POR_CANJE } from '@/lib/ddd-coins-helpers'
import { isAnyAdmin } from '@/lib/admin-roles'

export async function getSaldoCoins(userId: string): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Autorizados a leer el saldo de `userId`:
  //  - el propio usuario
  //  - cualquier admin (full o scoped) consultando a otro cliente
  //  - server actions sin sesión (user === null)
  if (user && user.id !== userId && !isAnyAdmin(user.email)) return 0

  const db = createServiceClient()
  const { data } = await db.rpc('get_saldo_coins', { p_user_id: userId })
  return (data as number | null) ?? 0
}

export async function getHistorialCoins(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user && user.id !== userId && !isAnyAdmin(user.email)) return []

  const db = createServiceClient()
  const { data } = await db
    .from('ddd_coins')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  return data ?? []
}

export async function registrarLoginDiario(): Promise<{ ganados: number; racha: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ganados: 0, racha: 0 }

  const db = createServiceClient()
  // Capturar timestamp una sola vez para evitar inconsistencias en medianoche
  const now = Date.now()
  const hoy  = new Date(now - 3 * 60 * 60 * 1000).toISOString().split('T')[0]
  const ayer = new Date(now - 3 * 60 * 60 * 1000 - 86400000).toISOString().split('T')[0]

  const { data: loginRow } = await db
    .from('ddd_coins_login')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (loginRow?.last_login_date === hoy) return { ganados: 0, racha: loginRow.racha_dias }
  const racha = loginRow?.last_login_date === ayer ? (loginRow.racha_dias + 1) : 1

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

  await db.from('ddd_coins').insert(
    puntosTransacciones.map(t => ({ user_id: user.id, ...t }))
  )

  const ganados = puntosTransacciones.reduce((s, t) => s + t.puntos, 0)

  // Sumar 50 pts de membresía activa (una vez por mes, idempotente)
  // Verificación barata: si compró 5+ kg en los últimos 30 días tiene membresía
  try {
    const { data: pedidosRecientes } = await db
      .from('filamento_pedidos')
      .select('total_rollos')
      .eq('user_id', user.id)
      .in('estado', ['confirmado', 'entregado'])
      .gte('updated_at', new Date(now - 30 * 86400000).toISOString())
    const kgRecientes = (pedidosRecientes ?? []).reduce(
      (s: number, p: { total_rollos: number }) => s + p.total_rollos, 0
    )
    if (kgRecientes >= 5) await sumarPuntosMembresiaActiva(user.id)
  } catch {}

  return { ganados, racha }
}

export async function sumarPuntosPorCompra(
  userId: string,
  rollos: number,
  ref: { pedidoId: string } | { ventaId: string },
): Promise<void> {
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

  const row: Record<string, unknown> = {
    user_id: userId,
    puntos: rollos * 10,
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
// de puntos sin contrapartida.
export async function revertirCoinsDePedido(pedidoId: string): Promise<void> {
  const db = createServiceClient()
  await db.from('ddd_coins').delete().eq('pedido_id', pedidoId)
}

// Revierte los ddd_coins asociados a una venta (local, no pedido web).
export async function revertirCoinsDeVenta(ventaId: string): Promise<void> {
  const db = createServiceClient()
  await db.from('ddd_coins').delete().eq('venta_id', ventaId)
}

export async function sumarPuntosMembresiaActiva(userId: string): Promise<void> {
  const db = createServiceClient()
  const inicioMes = new Date()
  inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0)
  const { count } = await db
    .from('ddd_coins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('motivo', 'membresia_mensual')
    .gte('created_at', inicioMes.toISOString())
  if ((count ?? 0) > 0) return
  await db.from('ddd_coins').insert({ user_id: userId, puntos: 50, motivo: 'membresia_mensual' })
}

export async function sumarPuntosPerfilCompleto(userId: string): Promise<void> {
  const db = createServiceClient()
  const { count } = await db
    .from('ddd_coins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('motivo', 'completar_perfil')
  if ((count ?? 0) > 0) return
  await db.from('ddd_coins').insert({ user_id: userId, puntos: 20, motivo: 'completar_perfil' })
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
