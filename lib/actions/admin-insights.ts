'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'
import { PUNTOS_POR_CANJE, PESOS_POR_CANJE } from '@/lib/ddd-coins-helpers'

export interface TopColorPedido {
  color: string
  material: string
  marca: string
  kg: number
  apariciones: number
}

export interface DashboardInsights {
  ticketPromedio: number
  pedidosFilamentoCount: number
  carritosAbandonados: number
  kgAbandonadosEnCarritos: number
  topColores: TopColorPedido[]
  coinsROI: {
    puntosRegalados: number
    pesosRegalados: number
    puntosCanjeados: number
    pesosCanjeados: number
    ratioCanje: number
  }
}

export async function getDashboardInsights(params: {
  desde: string
  hasta: string
}): Promise<DashboardInsights> {
  await getAdminUser()
  const db = createServiceClient()
  const desdeStr = params.desde
  const hastaStr = params.hasta + 'T23:59:59'

  const [
    { data: pedidosFil },
    { data: carritos },
    { data: coinsOtorgados },
    { data: coinsCanjeados },
  ] = await Promise.all([
    db
      .from('filamento_pedidos')
      .select('total, items, estado')
      .gte('created_at', desdeStr)
      .lte('created_at', hastaStr)
      .in('estado', ['confirmado', 'entregado']),
    db.from('filamento_carrito').select('user_id, items').neq('items', '[]'),
    db
      .from('ddd_coins')
      .select('puntos, motivo')
      .gte('created_at', desdeStr)
      .lte('created_at', hastaStr)
      .gt('puntos', 0),
    db
      .from('ddd_coins')
      .select('puntos, motivo')
      .gte('created_at', desdeStr)
      .lte('created_at', hastaStr)
      .lt('puntos', 0),
  ])

  const pedidos = pedidosFil ?? []
  const totalFac = pedidos.reduce((s: number, p: { total?: number }) => s + Number(p.total ?? 0), 0)
  const ticketPromedio = pedidos.length > 0 ? Math.round(totalFac / pedidos.length) : 0

  type Item = { filamento_id: string; nombre?: string; color?: string; material?: string; marca?: string; rollos?: number }
  const colorKey = new Map<string, TopColorPedido>()
  for (const p of pedidos) {
    const items = ((p as { items?: Item[] }).items ?? []) as Item[]
    for (const it of items) {
      const key = `${it.marca ?? '?'}|${it.material ?? '?'}|${it.color ?? '?'}`
      const prev = colorKey.get(key) ?? {
        color: it.color ?? '?',
        material: it.material ?? '?',
        marca: it.marca ?? '?',
        kg: 0,
        apariciones: 0,
      }
      prev.kg += Number(it.rollos ?? 0)
      prev.apariciones += 1
      colorKey.set(key, prev)
    }
  }
  const topColores = Array.from(colorKey.values())
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 5)

  const carritosActivos = carritos ?? []
  const kgAbandonados = carritosActivos.reduce((s: number, c: { items?: Item[] }) => {
    const arr = (c.items ?? []) as Item[]
    return s + arr.reduce((t, i) => t + Number(i.rollos ?? 0), 0)
  }, 0)

  const puntosRegalados = (coinsOtorgados ?? []).reduce(
    (s: number, r: { puntos: number }) => s + Number(r.puntos),
    0,
  )
  const puntosCanjeados = Math.abs(
    (coinsCanjeados ?? []).reduce((s: number, r: { puntos: number }) => s + Number(r.puntos), 0),
  )
  const pesosPorPunto = PESOS_POR_CANJE / PUNTOS_POR_CANJE
  const pesosRegalados = Math.round(puntosRegalados * pesosPorPunto)
  const pesosCanjeados = Math.round(puntosCanjeados * pesosPorPunto)
  const ratioCanje = puntosRegalados > 0 ? puntosCanjeados / puntosRegalados : 0

  return {
    ticketPromedio,
    pedidosFilamentoCount: pedidos.length,
    carritosAbandonados: carritosActivos.length,
    kgAbandonadosEnCarritos: kgAbandonados,
    topColores,
    coinsROI: {
      puntosRegalados,
      pesosRegalados,
      puntosCanjeados,
      pesosCanjeados,
      ratioCanje,
    },
  }
}
