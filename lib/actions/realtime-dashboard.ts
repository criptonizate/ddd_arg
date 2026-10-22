'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'

export interface CarritoLiveItem {
  filamento_id: string
  nombre: string
  color: string
  material: string
  marca: string
  totalKg: number
  totalUsuarios: number
}

export interface RealtimePanelData {
  // Pedidos físicos (orders)
  ordenesPendiente: number
  ordenesConfirmada: number
  ordenesImprimiendo: number
  ordenesListo: number
  // Pedidos web
  filamentoPedidosPendientes: number
  insumoPedidosPendientes: number
  // Cuentas nuevas (últimos 7 días)
  cuentasNuevas: number
  // Carritos activos ahora mismo
  carritoItems: CarritoLiveItem[]
  // Alertas de stock pendientes
  alertasStock: number
}

export async function getRealtimePanelData(): Promise<RealtimePanelData> {
  await getAdminUser()
  const db = createServiceClient()
  const hace7dias = new Date(Date.now() - 7 * 86400000).toISOString()

  const [
    { data: ordenes },
    { count: filamentoPend },
    { count: insumoPend },
    { count: cuentasNuevas },
    { data: carritos },
    { count: alertas },
  ] = await Promise.all([
    db.from('orders').select('estado').in('estado', ['pendiente', 'confirmada', 'imprimiendo', 'listo']),
    db.from('filamento_pedidos').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    db.from('insumo_pedidos').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    db.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', hace7dias),
    db.from('filamento_carrito').select('user_id, items'),
    db.from('filamento_alertas_stock').select('*', { count: 'exact', head: true }),
  ])

  // Contar orders por estado
  const ords = ordenes ?? []
  const ordenesPendiente = ords.filter((o: any) => o.estado === 'pendiente').length
  const ordenesConfirmada = ords.filter((o: any) => o.estado === 'confirmada').length
  const ordenesImprimiendo = ords.filter((o: any) => o.estado === 'imprimiendo').length
  const ordenesListo = ords.filter((o: any) => o.estado === 'listo').length

  // Agregar items de carrito
  const kgMap: Record<string, { nombre: string; color: string; material: string; marca: string; kg: number; usuarios: Set<string> }> = {}
  for (const row of carritos ?? []) {
    const items: any[] = Array.isArray(row.items) ? row.items : []
    for (const item of items) {
      const id = item.filamento_id ?? item.id
      if (!id) continue
      const kg = (item.rollos ?? item.cantidad ?? 0)
      if (!kgMap[id]) {
        kgMap[id] = { nombre: item.nombre ?? '', color: item.color ?? '', material: item.material ?? '', marca: item.marca ?? '', kg: 0, usuarios: new Set() }
      }
      kgMap[id].kg += kg
      kgMap[id].usuarios.add(row.user_id)
    }
  }

  const carritoItems: CarritoLiveItem[] = Object.entries(kgMap)
    .map(([filamento_id, v]) => ({ filamento_id, nombre: v.nombre, color: v.color, material: v.material, marca: v.marca, totalKg: v.kg, totalUsuarios: v.usuarios.size }))
    .filter(i => i.totalKg > 0)
    .sort((a, b) => b.totalKg - a.totalKg)

  return {
    ordenesPendiente,
    ordenesConfirmada,
    ordenesImprimiendo,
    ordenesListo,
    filamentoPedidosPendientes: filamentoPend ?? 0,
    insumoPedidosPendientes: insumoPend ?? 0,
    cuentasNuevas: cuentasNuevas ?? 0,
    carritoItems,
    alertasStock: alertas ?? 0,
  }
}
