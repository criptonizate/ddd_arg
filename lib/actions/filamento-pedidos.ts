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
    })
    .select('id, numero')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/filamentos')
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
