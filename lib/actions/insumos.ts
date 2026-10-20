'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'

export interface Insumo {
  id: string
  nombre: string
  descripcion: string | null
  categoria: string
  precio_unitario: number
  stock: number
  imagen_url: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface InsumoPedidoItem {
  insumo_id: string
  nombre: string
  cantidad: number
  precio_unitario: number
}

export interface InsumoPedido {
  id: string
  numero: number
  user_id: string | null
  cliente_nombre: string
  cliente_telefono: string | null
  items: InsumoPedidoItem[]
  total: number
  descuento_pct: number
  estado: 'pendiente' | 'confirmado' | 'cancelado' | 'entregado'
  nota: string | null
  created_at: string
  updated_at: string
}

// ── Público ──────────────────────────────────────────────────────────────────

export async function getInsumosDisponibles(): Promise<Insumo[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('insumos')
    .select('id, nombre, descripcion, categoria, precio_unitario, stock, imagen_url, activo')
    .eq('activo', true)
    .gt('stock', 0)
    .order('categoria')
    .order('nombre')
  return (data ?? []) as Insumo[]
}

export async function crearPedidoInsumo(data: {
  cliente_nombre: string
  cliente_telefono?: string
  items: InsumoPedidoItem[]
  total: number
  descuento_pct: number
}): Promise<{ numero?: number; id?: string; error?: string }> {
  if (!data.cliente_nombre.trim()) return { error: 'El nombre es requerido' }
  if (!data.items.length) return { error: 'El carrito está vacío' }

  const { createClient } = await import('@/lib/supabase/server')
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { error: 'Necesitás iniciar sesión para hacer un pedido' }

  const supabase = createServiceClient()
  const { data: row, error } = await supabase
    .from('insumo_pedidos')
    .insert({
      user_id: user.id,
      cliente_nombre: data.cliente_nombre.trim(),
      cliente_telefono: data.cliente_telefono?.trim() || null,
      items: data.items,
      total: data.total,
      descuento_pct: data.descuento_pct,
      estado: 'pendiente',
    })
    .select('id, numero')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/cuenta')
  revalidatePath('/admin/filamentos')
  return { numero: row.numero, id: row.id }
}

// ── Admin: catálogo ───────────────────────────────────────────────────────────

export async function getInsumos(): Promise<Insumo[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('insumos')
    .select('*')
    .order('categoria')
    .order('nombre')
  return (data ?? []) as Insumo[]
}

export async function createInsumo(data: {
  nombre: string
  descripcion?: string | null
  categoria: string
  precio_unitario: number
  stock: number
  imagen_url?: string | null
}): Promise<{ insumo?: Insumo; error?: string }> {
  await getAdminUser()
  if (!data.nombre.trim()) return { error: 'El nombre es requerido' }
  if (data.precio_unitario <= 0) return { error: 'El precio debe ser mayor a 0' }
  const supabase = createServiceClient()
  const { data: row, error } = await supabase
    .from('insumos')
    .insert({
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      categoria: data.categoria.trim() || 'General',
      precio_unitario: data.precio_unitario,
      stock: data.stock,
      imagen_url: data.imagen_url?.trim() || null,
    })
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  return { insumo: row as Insumo }
}

export async function updateInsumo(
  id: string,
  data: Partial<{
    nombre: string
    descripcion: string | null
    categoria: string
    precio_unitario: number
    stock: number
    imagen_url: string | null
    activo: boolean
  }>
): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('insumos')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  return {}
}

export async function deleteInsumo(id: string): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('insumos').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  return {}
}

// ── Admin: pedidos ────────────────────────────────────────────────────────────

export async function getInsumoPedidos(estado?: string): Promise<InsumoPedido[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  let q = supabase
    .from('insumo_pedidos')
    .select('*')
    .order('created_at', { ascending: false })
  if (estado) q = q.eq('estado', estado)
  const { data } = await q
  return (data ?? []) as InsumoPedido[]
}

export async function updateEstadoPedidoInsumo(
  id: string,
  estado: 'pendiente' | 'confirmado' | 'cancelado' | 'entregado',
  nota?: string
): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const upd: Record<string, unknown> = { estado, updated_at: new Date().toISOString() }
  if (nota !== undefined) upd.nota = nota
  const { error } = await supabase.from('insumo_pedidos').update(upd).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
  revalidatePath('/cuenta')
  return {}
}
