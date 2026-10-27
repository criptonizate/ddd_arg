import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendCarritoAbandonado } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ddd-arg.vercel.app'
  const ahora = new Date()
  const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000)
  const hace48h = new Date(ahora.getTime() - 48 * 60 * 60 * 1000)

  const { data: carritos, error } = await supabase
    .from('filamento_carrito')
    .select('user_id, items, updated_at')
    .lt('updated_at', hace24h.toISOString())
    .gt('updated_at', hace48h.toISOString())
    .not('items', 'eq', '[]')

  if (error) {
    console.error('Error obteniendo carritos:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!carritos || carritos.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No hay carritos abandonados' })
  }

  let sent = 0
  let errors = 0

  for (const carrito of carritos) {
    try {
      // No spamear a quien ya hizo un pedido en las últimas 24h
      const { data: pedidoReciente } = await supabase
        .from('filamento_pedidos')
        .select('id')
        .eq('user_id', carrito.user_id)
        .gt('created_at', hace24h.toISOString())
        .limit(1)
        .single()

      if (pedidoReciente) continue

      const { data: userData } = await supabase.auth.admin.getUserById(carrito.user_id)
      if (!userData?.user?.email) continue

      const userEmail = userData.user.email
      const userName =
        userData.user.user_metadata?.full_name?.split(' ')[0] ??
        userData.user.user_metadata?.name?.split(' ')[0] ??
        'amigo'

      const items = carrito.items as Array<{ filamento_id: string; rollos: number; precio_unitario?: number }>
      if (!items || items.length === 0) continue

      const filamentoIds = items.map(i => i.filamento_id)
      const { data: filamentos } = await supabase
        .from('filamentos')
        .select('id, nombre, precio_kg')
        .in('id', filamentoIds)

      const filamentosMap = Object.fromEntries((filamentos ?? []).map(f => [f.id, f]))

      const emailItems = items.map(item => ({
        nombre: filamentosMap[item.filamento_id]?.nombre ?? 'Filamento',
        kg: item.rollos,
        precioUnitario: filamentosMap[item.filamento_id]?.precio_kg ?? item.precio_unitario ?? 0,
      }))

      await sendCarritoAbandonado({ to: userEmail, nombre: userName, items: emailItems, siteUrl })
      sent++
    } catch (e) {
      console.error(`Error procesando carrito ${carrito.user_id}:`, e)
      errors++
    }
  }

  return NextResponse.json({ sent, errors, total: carritos.length })
}
