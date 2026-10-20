'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'

export interface FilamentoPedidoItem {
  filamento_id: string
  nombre: string
  color: string
  material: string
  marca: string
  rollos: number
  precio_unitario: number
}

export interface FilamentoPedido {
  id: string
  numero: number
  estado: 'pendiente' | 'confirmado' | 'cancelado' | 'entregado'
  cliente_nombre: string
  cliente_telefono: string | null
  items: FilamentoPedidoItem[]
  total_rollos: number
  descuento_por_rollo: number
  total: number
  nota: string | null
  created_at: string
  updated_at: string
}

// ── Público: crear pedido sin auth ─────────────────────────────────────────

export async function crearPedidoFilamento(data: {
  cliente_nombre: string
  cliente_telefono?: string
  items: FilamentoPedidoItem[]
  total_rollos: number
  descuento_por_rollo: number
  total: number
}): Promise<{ numero?: number; id?: string; error?: string }> {
  if (!data.cliente_nombre.trim()) return { error: 'El nombre es requerido' }
  if (!data.items.length) return { error: 'El carrito está vacío' }

  // Intentar obtener el user_id si el cliente está logueado
  let userId: string | null = null
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    userId = user?.id ?? null
  } catch { /* anonymous order */ }

  const supabase = createServiceClient()
  const { data: row, error } = await supabase
    .from('filamento_pedidos')
    .insert({
      cliente_nombre: data.cliente_nombre.trim(),
      cliente_telefono: data.cliente_telefono?.trim() || null,
      items: data.items,
      total_rollos: data.total_rollos,
      descuento_por_rollo: data.descuento_por_rollo,
      total: data.total,
      estado: 'pendiente',
      user_id: userId,
    })
    .select('id, numero')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  revalidatePath('/cuenta')
  return { numero: row.numero, id: row.id }
}

// ── Admin: listar pedidos ──────────────────────────────────────────────────

export async function getFilamentoPedidos(estado?: string): Promise<FilamentoPedido[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  let q = supabase
    .from('filamento_pedidos')
    .select('*')
    .order('created_at', { ascending: false })
  if (estado) q = q.eq('estado', estado)
  const { data } = await q
  return (data ?? []) as FilamentoPedido[]
}

export async function updateEstadoPedidoFilamento(
  id: string,
  estado: 'confirmado' | 'cancelado' | 'entregado',
  nota?: string,
): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('filamento_pedidos')
    .update({ estado, ...(nota !== undefined ? { nota } : {}), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  return {}
}

// Confirma el pedido y descuenta el stock de cada item
export async function confirmarPedidoYDescontarStock(
  pedidoId: string,
  nota?: string,
): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()

  // Obtener pedido
  const { data: pedido, error: fetchErr } = await supabase
    .from('filamento_pedidos')
    .select('*')
    .eq('id', pedidoId)
    .single()

  if (fetchErr || !pedido) return { error: 'Pedido no encontrado' }
  if (pedido.estado !== 'pendiente') return { error: `El pedido ya está ${pedido.estado}` }

  const items = pedido.items as FilamentoPedidoItem[]
  const fecha = new Date().toISOString().split('T')[0]
  const errors: string[] = []

  for (const item of items) {
    const gramos = Math.round(item.rollos * 1000) // rollos = kg

    // Stock actual
    const { data: fil, error: filErr } = await supabase
      .from('filamentos')
      .select('gramos_sueltos, rollos_cerrados, peso_rollo_gr, costo_kg')
      .eq('id', item.filamento_id)
      .single()

    if (filErr || !fil) { errors.push(`Filamento ${item.color} no encontrado`); continue }

    const totalDisp = fil.rollos_cerrados * fil.peso_rollo_gr + fil.gramos_sueltos
    if (gramos > totalDisp) {
      errors.push(`Stock insuficiente para ${item.color} (pedido ${item.rollos} kg, stock ${Math.floor(totalDisp / 1000)} kg)`)
      continue
    }

    // Descontar stock (sueltos primero, luego rollos)
    let restante = gramos
    let nuevoSueltos = fil.gramos_sueltos
    let nuevoRollos = fil.rollos_cerrados

    if (nuevoSueltos >= restante) {
      nuevoSueltos -= restante
      restante = 0
    } else {
      restante -= nuevoSueltos
      nuevoSueltos = 0
    }
    if (restante > 0) {
      const rollosNecesarios = Math.ceil(restante / fil.peso_rollo_gr)
      nuevoRollos = Math.max(0, nuevoRollos - rollosNecesarios)
      nuevoSueltos = Math.max(0, rollosNecesarios * fil.peso_rollo_gr - restante)
    }

    await supabase
      .from('filamentos')
      .update({ gramos_sueltos: nuevoSueltos, rollos_cerrados: nuevoRollos })
      .eq('id', item.filamento_id)

    // Registrar en historial de ventas
    await supabase
      .from('filamento_ventas')
      .insert({
        filamento_id: item.filamento_id,
        gramos,
        precio_kg: item.precio_unitario,
        costo_kg: fil.costo_kg || 0,
        cliente: pedido.cliente_nombre,
        nota: `Pedido web N°${pedido.numero}`,
        fecha,
      })
  }

  if (errors.length === items.length) {
    return { error: errors.join('; ') }
  }

  const notaFinal = [nota, errors.length ? `Advertencias: ${errors.join('; ')}` : ''].filter(Boolean).join(' — ')

  const { error: updErr } = await supabase
    .from('filamento_pedidos')
    .update({
      estado: 'confirmado',
      ...(notaFinal ? { nota: notaFinal } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', pedidoId)

  if (updErr) return { error: updErr.message }

  revalidatePath('/admin/filamentos')
  revalidatePath('/filamentos')
  return {}
}

export async function editarItemsPedidoFilamento(
  pedidoId: string,
  items: FilamentoPedidoItem[]
): Promise<{ error?: string }> {
  await getAdminUser()
  if (!items.length) return { error: 'El pedido debe tener al menos un ítem' }

  const total_rollos = items.reduce((s, i) => s + i.rollos, 0)
  // Recalcular descuento por volumen
  const TIERS = [{ min: 15, desc: 4000 }, { min: 10, desc: 3000 }, { min: 5, desc: 2000 }, { min: 0, desc: 0 }]
  const descuento_por_rollo = TIERS.find(t => total_rollos >= t.min)?.desc ?? 0
  const precio_unitario = items[0]?.precio_unitario ?? 22000
  const total = total_rollos * (precio_unitario - descuento_por_rollo)

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('filamento_pedidos')
    .update({ items, total_rollos, descuento_por_rollo, total, updated_at: new Date().toISOString() })
    .eq('id', pedidoId)

  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  return {}
}

import { KG_RENOVACION, DIAS_PERIODO, TIERS_MEMBRESIA, type NivelMembresia, type MembresiaStatus } from '@/lib/membresia-helpers'
export type { NivelMembresia, MembresiaStatus } from '@/lib/membresia-helpers'

type PedidoRow = { updated_at: string; total_rollos: number }

function addDias(date: Date, dias: number): Date {
  return new Date(date.getTime() + dias * 24 * 60 * 60 * 1000)
}

// Calcula el período activo a partir del historial de pedidos (sin DB extra)
// Lógica: un pedido >= KG_RENOVACION dentro del período lo extiende 30d desde esa fecha
function calcularPeriodo(pedidos: PedidoRow[]): { periodoInicio: Date; periodoFin: Date; kgPeriodo: number } {
  let periodoInicio = new Date(pedidos[0].updated_at)
  let periodoFin = addDias(periodoInicio, DIAS_PERIODO)
  let kgPeriodo = 0

  for (const p of pedidos) {
    const fecha = new Date(p.updated_at)
    const kg = p.total_rollos ?? 0

    if (fecha < periodoFin) {
      // Dentro del período activo
      kgPeriodo += kg
      if (kg >= KG_RENOVACION) {
        // Este pedido renueva: extiende 30d desde su fecha
        const nuevaFin = addDias(fecha, DIAS_PERIODO)
        if (nuevaFin > periodoFin) periodoFin = nuevaFin
      }
    } else {
      // Fuera del período — inicia uno nuevo
      periodoInicio = fecha
      periodoFin = addDias(fecha, DIAS_PERIODO)
      kgPeriodo = kg
    }
  }

  return { periodoInicio, periodoFin, kgPeriodo }
}

// Público — sin auth de admin, llamado desde la página de cuenta del cliente
export async function getMembresiaCliente(userId: string): Promise<MembresiaStatus | null> {
  const supabase = createServiceClient()

  const { data: pedidos } = await supabase
    .from('filamento_pedidos')
    .select('updated_at, total_rollos')
    .eq('user_id', userId)
    .in('estado', ['confirmado', 'entregado'])
    .order('updated_at', { ascending: true })

  if (!pedidos?.length) return null

  const rows = pedidos as PedidoRow[]
  const totalHistorico = rows.reduce((s, p) => s + (p.total_rollos ?? 0), 0)

  const { periodoInicio, periodoFin, kgPeriodo } = calcularPeriodo(rows)

  const nowMs = Date.now()
  const activo = periodoFin.getTime() > nowMs
  const diasRestantes = activo ? Math.max(0, Math.ceil((periodoFin.getTime() - nowMs) / (24 * 60 * 60 * 1000))) : 0

  const tierActivo = activo ? TIERS_MEMBRESIA.find(t => kgPeriodo >= t.min) : undefined
  const nivel: NivelMembresia = tierActivo?.label ?? null

  return {
    kgPeriodo: activo ? kgPeriodo : 0,
    periodoInicio: periodoInicio.toISOString(),
    periodoFin: periodoFin.toISOString(),
    diasRestantes,
    nivel,
    descuento: tierActivo?.descuento ?? 0,
    totalHistorico,
  }
}

export async function getFilamentoPedidosPendientesCount(): Promise<number> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('filamento_pedidos')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pendiente')
  return count ?? 0
}
