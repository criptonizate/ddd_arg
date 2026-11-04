import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cron: cancela pedidos pendientes cuya reserva de stock venció.
 *
 * Problema que resuelve: antes un pedido pendiente que nunca se confirmaba
 * dejaba (a) coins "compra" ganados sin contrapartida, (b) stock reservado
 * indefinidamente aunque reservado_hasta hubiese pasado, (c) canje de coins
 * ya debitado del saldo del cliente sin forma de recuperarlo.
 *
 * Qué hace: busca pedidos con estado='pendiente' y reservado_hasta < now(),
 * los pasa a 'cancelado' con nota 'Expirado por reserva vencida', libera sus
 * reservas, revierte los coins (compra + canje).
 *
 * Idempotente: si no hay nada que cancelar, no hace nada.
 *
 * Programar en vercel.json con schedule '* /10 * * * *' (cada 10 min).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const ahora = new Date().toISOString()
  const { data: pedidos, error } = await supabase
    .from('filamento_pedidos')
    .select('id, numero, cliente_nombre, user_id')
    .eq('estado', 'pendiente')
    .lt('reservado_hasta', ahora)

  if (error) {
    console.error('[cron expirar-pedidos] fetch error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!pedidos || pedidos.length === 0) {
    return NextResponse.json({ ok: true, cancelados: 0 })
  }

  const ids = pedidos.map(p => p.id)
  const nota = 'Expirado por reserva vencida'

  // Cancelar en batch
  const { error: updErr } = await supabase
    .from('filamento_pedidos')
    .update({ estado: 'cancelado', nota, updated_at: ahora })
    .in('id', ids)
  if (updErr) {
    console.error('[cron expirar-pedidos] update error', updErr)
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  // Liberar reservas y revertir coins (ambos por pedido_id)
  await supabase.from('filamento_reservas').delete().in('pedido_id', ids)
  await supabase.from('ddd_coins').delete().in('pedido_id', ids)

  console.log('[cron expirar-pedidos]', ids.length, 'pedidos cancelados')
  return NextResponse.json({ ok: true, cancelados: ids.length, ids })
}
