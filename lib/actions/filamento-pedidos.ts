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

export async function getFilamentoPedidosPendientesCount(): Promise<number> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { count } = await supabase
    .from('filamento_pedidos')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pendiente')
  return count ?? 0
}
