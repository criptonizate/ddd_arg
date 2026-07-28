'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'

export interface ClienteStats {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  direccion: string | null
  notas: string | null
  created_at: string
  totalPedidos: number
  totalGastado: number
  totalPagado: number
  totalPendiente: number
  ultimaCompra: string | null
}

export interface ClienteDetalle extends ClienteStats {
  pedidos: {
    id: string
    estado: string
    total: number
    sena: number | null
    created_at: string
    origen: string
    nota: string | null
    items: { nombre_producto: string; cantidad: number; precio_unitario: number; precio_original: number | null }[]
  }[]
}

// ── Buscar o crear cliente por nombre (usado internamente al crear pedidos) ─

export async function findOrCreateCliente(
  nombre: string,
  telefono?: string | null
): Promise<string> {
  const supabase = createServiceClient()

  // Buscar por nombre exacto (case-insensitive)
  const { data: existing } = await supabase
    .from('clientes')
    .select('id, telefono')
    .ilike('nombre', nombre.trim())
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Actualizar teléfono si no lo tenía y ahora lo tenemos
    if (telefono && !existing.telefono) {
      await supabase.from('clientes').update({ telefono, updated_at: new Date().toISOString() }).eq('id', existing.id)
    }
    return existing.id
  }

  // Crear nuevo cliente
  const { data: nuevo, error } = await supabase
    .from('clientes')
    .insert({ nombre: nombre.trim(), telefono: telefono || null })
    .select('id')
    .single()

  if (error || !nuevo) throw new Error(error?.message ?? 'No se pudo crear el cliente')
  return nuevo.id
}

// ── Lectura ────────────────────────────────────────────────────────────────

export async function getClientes(): Promise<ClienteStats[]> {
  await getAdminUser()
  const supabase = createServiceClient()

  const [{ data: clientes }, { data: orders }] = await Promise.all([
    supabase.from('clientes').select('*').order('nombre'),
    supabase.from('orders').select('cliente_id, total, sena, created_at, estado').neq('estado', 'cancelada'),
  ])

  type RawOrder = { cliente_id: string | null; total: number; sena: number | null; created_at: string; estado: string }
  const allOrders: RawOrder[] = (orders ?? []) as RawOrder[]

  return (clientes ?? []).map((c: { id: string } & Record<string, unknown>) => {
    const pedidos = allOrders.filter((o) => o.cliente_id === c.id)
    const totalGastado = pedidos.reduce((s, o) => s + Number(o.total), 0)
    const totalPagado = pedidos.reduce((s, o) => s + Number(o.sena ?? 0), 0)
    const totalPendiente = pedidos.reduce((s, o) => s + Math.max(0, Number(o.total) - Number(o.sena ?? 0)), 0)
    const fechas = pedidos.map((o) => o.created_at).sort().reverse()
    return {
      ...c,
      totalPedidos: pedidos.length,
      totalGastado,
      totalPagado,
      totalPendiente,
      ultimaCompra: fechas[0] ?? null,
    }
  }).sort((a: ClienteStats, b: ClienteStats) => b.totalGastado - a.totalGastado) as ClienteStats[]
}

export async function getCliente(id: string): Promise<ClienteDetalle | null> {
  await getAdminUser()
  const supabase = createServiceClient()

  const [{ data: cliente }, { data: orders }] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('orders')
      .select('id, estado, total, sena, created_at, origen, nota, order_items(nombre_producto, cantidad, precio_unitario, precio_original)')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!cliente) return null

  type RawOrderDetail = { id: string; estado: string; total: number; sena: number | null; created_at: string; origen: string; nota: string | null; order_items: unknown[] | null }
  const allOrders: RawOrderDetail[] = (orders ?? []) as RawOrderDetail[]
  const pedidosValidos = allOrders.filter((o) => o.estado !== 'cancelada')
  const totalGastado = pedidosValidos.reduce((s, o) => s + Number(o.total), 0)
  const fechas = pedidosValidos.map((o) => o.created_at).sort().reverse()

  return {
    ...cliente,
    totalPedidos: pedidosValidos.length,
    totalGastado,
    ultimaCompra: fechas[0] ?? null,
    pedidos: allOrders.map((o) => ({
      id: o.id,
      estado: o.estado,
      total: Number(o.total),
      sena: o.sena ? Number(o.sena) : null,
      created_at: o.created_at,
      origen: o.origen,
      nota: o.nota,
      items: (o.order_items ?? []).map((i: any) => ({
        nombre_producto: i.nombre_producto,
        cantidad: i.cantidad,
        precio_unitario: Number(i.precio_unitario),
        precio_original: i.precio_original != null ? Number(i.precio_original) : null,
      })),
    })),
  }
}

// ── Escritura ──────────────────────────────────────────────────────────────

export async function updateCliente(
  id: string,
  data: { nombre: string; telefono?: string; email?: string; direccion?: string; notas?: string }
): Promise<{ error?: string }> {
  await getAdminUser()
  if (!data.nombre?.trim()) return { error: 'El nombre es obligatorio' }
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('clientes')
    .update({
      nombre: data.nombre.trim(),
      telefono: data.telefono?.trim() || null,
      email: data.email?.trim() || null,
      direccion: data.direccion?.trim() || null,
      notas: data.notas?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/clientes')
  revalidatePath(`/admin/clientes/${id}`)
  return {}
}

export async function createCliente(
  data: { nombre: string; telefono?: string; email?: string; notas?: string }
): Promise<{ id?: string; error?: string }> {
  await getAdminUser()
  if (!data.nombre?.trim()) return { error: 'El nombre es obligatorio' }
  const supabase = createServiceClient()
  const { data: nuevo, error } = await supabase
    .from('clientes')
    .insert({ nombre: data.nombre.trim(), telefono: data.telefono?.trim() || null, email: data.email?.trim() || null, notas: data.notas?.trim() || null })
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/admin/clientes')
  return { id: nuevo.id }
}

export async function deleteCliente(id: string): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/clientes')
  return {}
}

export async function searchClientes(q: string): Promise<{ id: string; nombre: string; telefono: string | null }[]> {
  await getAdminUser()
  if (!q.trim()) return []
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('clientes')
    .select('id, nombre, telefono')
    .ilike('nombre', `%${q}%`)
    .order('nombre')
    .limit(10)
  return (data ?? []) as { id: string; nombre: string; telefono: string | null }[]
}

export async function getClienteNames(): Promise<{ nombre: string; telefono: string | null }[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase.from('clientes').select('nombre, telefono').order('nombre')
  return (data ?? []) as { nombre: string; telefono: string | null }[]
}

export async function getClientesBasic(): Promise<{ id: string; nombre: string; telefono: string | null; email: string | null; direccion: string | null }[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase.from('clientes').select('id, nombre, telefono, email, direccion').order('nombre')
  return (data ?? []) as { id: string; nombre: string; telefono: string | null; email: string | null; direccion: string | null }[]
}
