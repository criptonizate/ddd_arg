'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'
import { EgresoSchema, IngresoManualSchema } from '@/lib/validations/finance'
import type { EgresoValues, IngresoManualValues } from '@/lib/validations/finance'

export async function createEgreso(data: EgresoValues) {
  await getAdminUser()
  const validated = EgresoSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.flatten().fieldErrors }

  const supabase = createServiceClient()
  const { error } = await supabase.from('transactions').insert({
    tipo: 'egreso',
    ...validated.data,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/finanzas')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function createIngresoManual(data: IngresoManualValues) {
  await getAdminUser()
  const validated = IngresoManualSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.flatten().fieldErrors }

  const supabase = createServiceClient()
  const { error } = await supabase.from('transactions').insert({
    tipo: 'ingreso',
    categoria: 'ingreso_manual',
    ...validated.data,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/finanzas')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function deleteTransaction(id: string) {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/finanzas')
  return { success: true }
}

export async function getTransactions(params?: {
  desde?: string
  hasta?: string
  tipo?: 'ingreso' | 'egreso'
}) {
  const supabase = createServiceClient()
  let query = supabase
    .from('transactions')
    .select('*')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (params?.desde) query = query.gte('fecha', params.desde)
  if (params?.hasta) query = query.lte('fecha', params.hasta)
  if (params?.tipo) query = query.eq('tipo', params.tipo)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getBalance(desde?: string, hasta?: string) {
  const transactions = await getTransactions({ desde, hasta })

  const ingresos = transactions
    .filter((t: any) => t.tipo === 'ingreso')
    .reduce((sum: number, t: any) => sum + Number(t.monto), 0)

  const egresos = transactions
    .filter((t: any) => t.tipo === 'egreso')
    .reduce((sum: number, t: any) => sum + Number(t.monto), 0)

  return { ingresos, egresos, balance: ingresos - egresos, transactions }
}

// Dashboard stats
export async function getDashboardStats() {
  const supabase = createServiceClient()

  const now = new Date()
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const hoy = now.toISOString().split('T')[0]
  const hace30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Todas las queries en paralelo
  const [
    { data: ventasMes },
    { data: txMes },
    { data: pedidosEstado },
    { data: ventasDia },
    { data: topItems },
    { data: stockBajo },
    { data: pendientesCobro },
    { count: pedidosPendientes },
    { data: cancelacionesMes },
    { data: ventasHoy },
  ] = await Promise.all([
    supabase.from('orders').select('total, estado, created_at').gte('created_at', primerDiaMes).neq('estado', 'cancelada'),
    supabase.from('transactions').select('tipo, monto').gte('fecha', primerDiaMes),
    supabase.from('orders').select('estado'),
    supabase.from('orders').select('total, created_at').gte('created_at', hace30).neq('estado', 'cancelada'),
    supabase.from('order_items').select('cantidad, precio_unitario, product_variants (nombre_variante), products (nombre), orders!inner (estado)').neq('orders.estado', 'cancelada'),
    supabase.from('product_variants').select('*, products (nombre)').filter('stock', 'lte', 'stock_minimo'),
    supabase.from('orders').select('total, sena').in('estado', ['confirmada', 'listo']),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('orders').select('id').eq('estado', 'cancelada').gte('created_at', primerDiaMes),
    supabase.from('orders').select('total').gte('created_at', hoy).neq('estado', 'cancelada'),
  ])

  // Calcular stats
  const ingresosMes = txMes
    ?.filter((t: any) => t.tipo === 'ingreso')
    .reduce((s: number, t: any) => s + Number(t.monto), 0) ?? 0
  const egresosMes = txMes
    ?.filter((t: any) => t.tipo === 'egreso')
    .reduce((s: number, t: any) => s + Number(t.monto), 0) ?? 0

  // Agrupar ventas por día
  const ventasPorDiaMap = new Map<string, { total: number; cantidad: number }>()
  ventasDia?.forEach((v: any) => {
    const d = v.created_at.split('T')[0]
    const prev = ventasPorDiaMap.get(d) ?? { total: 0, cantidad: 0 }
    ventasPorDiaMap.set(d, { total: prev.total + Number(v.total), cantidad: prev.cantidad + 1 })
  })
  const ventasPorDia = Array.from(ventasPorDiaMap.entries())
    .map(([fecha, data]) => ({ fecha, ...data }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Top variantes agrupadas
  const topMap = new Map<string, { nombre_variante: string; producto: string; vendidos: number; ingresos: number }>()
  topItems?.forEach((item: any) => {
    const key = item.product_variants?.nombre_variante ?? 'Sin variante'
    const prev = topMap.get(key) ?? {
      nombre_variante: key,
      producto: item.products?.nombre ?? '',
      vendidos: 0,
      ingresos: 0,
    }
    topMap.set(key, {
      ...prev,
      vendidos: prev.vendidos + item.cantidad,
      ingresos: prev.ingresos + item.cantidad * Number(item.precio_unitario),
    })
  })
  const topVariantes = Array.from(topMap.values())
    .sort((a, b) => b.vendidos - a.vendidos)
    .slice(0, 10)

  // Pedidos por estado
  const estadoMap = new Map<string, number>()
  pedidosEstado?.forEach((o: any) => {
    estadoMap.set(o.estado, (estadoMap.get(o.estado) ?? 0) + 1)
  })
  const pedidosPorEstado = Array.from(estadoMap.entries()).map(([estado, count]) => ({
    estado: estado as any,
    count,
  }))

  // Stock bajo — filtrar donde stock <= stock_minimo
  const stockBajoFiltrado = (stockBajo ?? []).filter(
    (v: any) => v.stock <= v.stock_minimo
  ).map((v: any) => ({ ...v, product_nombre: v.products?.nombre ?? '' }))

  const cobroPendiente = (pendientesCobro ?? []).reduce(
    (sum: number, o: any) => sum + Math.max(0, Number(o.total) - Number(o.sena ?? 0)),
    0
  )

  const ventasHoyCount = ventasHoy?.length ?? 0
  const montoHoy = (ventasHoy ?? []).reduce((s: number, o: any) => s + Number(o.total), 0)

  return {
    ventasMes: ventasMes?.length ?? 0,
    ingresosMes,
    egresosMes,
    balanceMes: ingresosMes - egresosMes,
    totalVentas: pedidosEstado?.length ?? 0,
    totalIngresos: 0,
    pedidosPorEstado,
    ventasPorDia,
    topVariantes,
    stockBajo: stockBajoFiltrado,
    cobroPendiente,
    pedidosPendientes: pedidosPendientes ?? 0,
    cancelacionesMes: cancelacionesMes?.length ?? 0,
    ventasHoy: ventasHoyCount,
    montoHoy,
  }
}
