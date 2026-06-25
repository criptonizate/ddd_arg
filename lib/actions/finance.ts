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

  // Agrupar por día para gráfico
  const porDia = new Map<string, { ingreso: number; egreso: number }>()
  transactions.forEach((t: any) => {
    const d = t.fecha.split('T')[0]
    const prev = porDia.get(d) ?? { ingreso: 0, egreso: 0 }
    if (t.tipo === 'ingreso') prev.ingreso += Number(t.monto)
    else prev.egreso += Number(t.monto)
    porDia.set(d, prev)
  })
  const chartData = Array.from(porDia.entries())
    .map(([fecha, v]) => ({ fecha, ...v }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  return { ingresos, egresos, balance: ingresos - egresos, transactions, chartData }
}

// Dashboard stats
export async function getDashboardStats(params?: { desde?: string; hasta?: string }) {
  const supabase = createServiceClient()

  const now = new Date()
  const hoy = now.toISOString().split('T')[0]
  const hace30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Período para KPIs: usar params si existen, sino mes actual
  const primerDiaMes = params?.desde ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const ultimoDiaMes = params?.hasta ?? hoy

  // Todas las queries en paralelo
  const [
    { data: ventasMes },
    { data: txMes },
    { data: ventasDia },
    { data: stockBajo },
    { data: pendientesCobro },
    { count: pedidosPendientes },
    { data: ventasHoy },
    { count: clientesNuevosMes },
  ] = await Promise.all([
    supabase.from('orders').select('total, estado, created_at').gte('created_at', primerDiaMes).lte('created_at', ultimoDiaMes + 'T23:59:59').neq('estado', 'cancelada'),
    supabase.from('transactions').select('tipo, monto').gte('fecha', primerDiaMes).lte('fecha', ultimoDiaMes),
    supabase.from('orders').select('total, created_at, cantidad:id').gte('created_at', hace30).neq('estado', 'cancelada'),
    supabase.rpc('get_stock_bajo'),
    supabase.from('orders').select('total, sena').in('estado', ['confirmada', 'imprimiendo', 'listo']),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    supabase.from('orders').select('total').gte('created_at', hoy).neq('estado', 'cancelada'),
    supabase.from('clientes').select('*', { count: 'exact', head: true }).gte('created_at', primerDiaMes).lte('created_at', ultimoDiaMes + 'T23:59:59'),
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

  // stock_bajo viene ya filtrado y ordenado por la RPC
  const stockBajoFiltrado = (stockBajo ?? []) as any[]

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
    ventasPorDia,
    stockBajo: stockBajoFiltrado,
    cobroPendiente,
    pedidosPendientes: pedidosPendientes ?? 0,
    ventasHoy: ventasHoyCount,
    montoHoy,
    clientesNuevosMes: clientesNuevosMes ?? 0,
  }
}
