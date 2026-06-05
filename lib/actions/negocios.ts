'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface NegocioItem {
  id: string
  pedido_id: string
  nombre_producto: string
  precio_mayorista: number
  cantidad: number
}

export interface NegocioPedido {
  id: string
  negocio_id: string
  fecha: string
  nota: string | null
  entregado_at: string | null
  created_at: string
  negocio_items: NegocioItem[]
}

export interface NegocioEgreso {
  id: string
  negocio_id: string
  nombre_producto: string
  tipo: 'vendido' | 'devuelto'
  cantidad: number
  fecha: string
  nota: string | null
  created_at: string
}

export interface Negocio {
  id: string
  nombre: string
  contacto: string | null
  created_at: string
  negocio_pedidos: NegocioPedido[]
  negocio_egresos: NegocioEgreso[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function pedidoTotal(pedido: NegocioPedido): number {
  return pedido.negocio_items.reduce((s, i) => s + Number(i.precio_mayorista) * i.cantidad, 0)
}

function sortPedidos(pedidos: NegocioPedido[]): NegocioPedido[] {
  return [...pedidos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
}

function revalidate(negocioId: string) {
  revalidatePath('/admin/negocios')
  revalidatePath(`/admin/negocios/${negocioId}`)
}

// ── Lectura ────────────────────────────────────────────────────────────────

export async function getNegocios(): Promise<Negocio[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('negocios')
    .select('*, negocio_pedidos(*, negocio_items(*))')
    .order('nombre', { ascending: true })
  if (error) throw new Error(error.message)

  const negocios = (data ?? []).map((n: any) => ({
    ...n,
    negocio_pedidos: sortPedidos(n.negocio_pedidos ?? []),
    negocio_egresos: [] as NegocioEgreso[],
  }))

  // Fetch egresos por separado — tabla puede no existir todavía si la migración no se corrió
  try {
    const { data: egresos, error: egError } = await supabase.from('negocio_egresos').select('*')
    if (!egError && egresos) {
      const map = new Map<string, NegocioEgreso[]>()
      for (const e of egresos) {
        const arr = map.get(e.negocio_id) ?? []
        arr.push(e as NegocioEgreso)
        map.set(e.negocio_id, arr)
      }
      for (const n of negocios) n.negocio_egresos = map.get(n.id) ?? []
    }
  } catch { /* tabla aún no existe */ }

  return negocios
}

export async function getNegocio(id: string): Promise<Negocio | null> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('negocios')
    .select('*, negocio_pedidos(*, negocio_items(*))')
    .eq('id', id)
    .single()
  if (error) return null

  let egresos: NegocioEgreso[] = []
  try {
    const { data: eg, error: egError } = await supabase
      .from('negocio_egresos')
      .select('*')
      .eq('negocio_id', id)
      .order('created_at', { ascending: false })
    if (!egError && eg) egresos = eg as NegocioEgreso[]
  } catch { /* tabla aún no existe */ }

  return {
    ...data,
    negocio_pedidos: sortPedidos(data.negocio_pedidos ?? []),
    negocio_egresos: egresos,
  }
}

// ── Negocios ───────────────────────────────────────────────────────────────

export async function createNegocio(data: { nombre: string; contacto?: string }): Promise<{ error?: string }> {
  await getAdminUser()
  if (!data.nombre?.trim()) return { error: 'El nombre es obligatorio' }
  const supabase = createServiceClient()
  const { error } = await supabase.from('negocios').insert({
    nombre: data.nombre.trim(),
    contacto: data.contacto?.trim() || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/negocios')
  return {}
}

export async function updateNegocio(id: string, data: { nombre: string; contacto?: string }): Promise<{ error?: string }> {
  await getAdminUser()
  if (!data.nombre?.trim()) return { error: 'El nombre es obligatorio' }
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('negocios')
    .update({ nombre: data.nombre.trim(), contacto: data.contacto?.trim() || null })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidate(id)
  return {}
}

export async function deleteNegocio(id: string): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('negocios').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/negocios')
  return {}
}

// ── Pedidos ────────────────────────────────────────────────────────────────

export async function createNegocioPedido(data: {
  negocio_id: string
  fecha: string
  nota?: string
  items: { nombre_producto: string; precio_mayorista: number; cantidad: number }[]
}): Promise<{ error?: string }> {
  await getAdminUser()
  if (!data.items.length) return { error: 'Agregá al menos un producto' }
  const supabase = createServiceClient()
  const { data: pedido, error: pedidoError } = await supabase
    .from('negocio_pedidos')
    .insert({ negocio_id: data.negocio_id, fecha: data.fecha, nota: data.nota?.trim() || null })
    .select()
    .single()
  if (pedidoError) return { error: pedidoError.message }
  const { error: itemsError } = await supabase.from('negocio_items').insert(
    data.items.map((i) => ({
      pedido_id: pedido.id,
      nombre_producto: i.nombre_producto.trim(),
      precio_mayorista: i.precio_mayorista,
      cantidad: i.cantidad,
    }))
  )
  if (itemsError) return { error: itemsError.message }
  revalidate(data.negocio_id)
  return {}
}

export async function markPedidoEntregado(pedidoId: string, negocioId: string, fecha: string): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('negocio_pedidos')
    .update({ entregado_at: new Date(fecha + 'T12:00:00').toISOString() })
    .eq('id', pedidoId)
  if (error) return { error: error.message }
  revalidate(negocioId)
  return {}
}

export async function deleteNegocioPedido(id: string, negocioId: string): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('negocio_pedidos').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidate(negocioId)
  return {}
}

export async function addItemsToPedido(
  pedidoId: string,
  negocioId: string,
  items: { nombre_producto: string; precio_mayorista: number; cantidad: number }[]
): Promise<{ error?: string }> {
  await getAdminUser()
  if (!items.length) return { error: 'Agregá al menos un item' }
  const supabase = createServiceClient()
  const { error } = await supabase.from('negocio_items').insert(
    items.map((i) => ({
      pedido_id: pedidoId,
      nombre_producto: i.nombre_producto.trim(),
      precio_mayorista: i.precio_mayorista,
      cantidad: i.cantidad,
    }))
  )
  if (error) return { error: error.message }
  revalidate(negocioId)
  return {}
}

export async function deleteNegocioItem(id: string, negocioId: string): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('negocio_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidate(negocioId)
  return {}
}

export async function updatePedidoCompleto(
  pedidoId: string,
  negocioId: string,
  data: {
    fecha: string
    nota?: string
    items: { id: string; precio_mayorista: number; cantidad: number }[]
  }
): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error: pedidoError } = await supabase
    .from('negocio_pedidos')
    .update({ fecha: data.fecha, nota: data.nota?.trim() || null })
    .eq('id', pedidoId)
  if (pedidoError) return { error: pedidoError.message }
  for (const item of data.items) {
    const { error } = await supabase
      .from('negocio_items')
      .update({ precio_mayorista: item.precio_mayorista, cantidad: item.cantidad })
      .eq('id', item.id)
    if (error) return { error: error.message }
  }
  revalidate(negocioId)
  return {}
}

// ── Egresos ────────────────────────────────────────────────────────────────

export async function createEgresoNegocio(
  negocioId: string,
  data: { nombre_producto: string; tipo: 'vendido' | 'devuelto'; cantidad: number; fecha: string; nota?: string }
): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('negocio_egresos').insert({
    negocio_id: negocioId,
    nombre_producto: data.nombre_producto.trim(),
    tipo: data.tipo,
    cantidad: data.cantidad,
    fecha: data.fecha,
    nota: data.nota?.trim() || null,
  })
  if (error) return { error: error.message }
  revalidate(negocioId)
  return {}
}

export async function createEgresosNegocio(
  negocioId: string,
  items: { nombre_producto: string; tipo: 'vendido' | 'devuelto'; cantidad: number; fecha: string; nota?: string }[]
): Promise<{ error?: string }> {
  await getAdminUser()
  if (!items.length) return { error: 'Agregá al menos un item' }
  const supabase = createServiceClient()
  const { error } = await supabase.from('negocio_egresos').insert(
    items.map((d) => ({
      negocio_id: negocioId,
      nombre_producto: d.nombre_producto.trim(),
      tipo: d.tipo,
      cantidad: d.cantidad,
      fecha: d.fecha,
      nota: d.nota?.trim() || null,
    }))
  )
  if (error) return { error: error.message }
  revalidate(negocioId)
  return {}
}

export async function deleteEgresoNegocio(id: string, negocioId: string): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('negocio_egresos').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidate(negocioId)
  return {}
}
