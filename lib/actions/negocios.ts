'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'

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
  created_at: string
  negocio_items: NegocioItem[]
}

export interface Negocio {
  id: string
  nombre: string
  contacto: string | null
  created_at: string
  negocio_pedidos: NegocioPedido[]
}

export async function getNegocios(): Promise<Negocio[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('negocios')
    .select(`
      *,
      negocio_pedidos (
        *,
        negocio_items (*)
      )
    `)
    .order('nombre', { ascending: true })

  if (error) throw new Error(error.message)

  // Ordenar pedidos dentro de cada negocio: más reciente primero
  return (data ?? []).map((n: any) => ({
    ...n,
    negocio_pedidos: [...(n.negocio_pedidos ?? [])].sort(
      (a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    ),
  }))
}

export async function createNegocio(data: {
  nombre: string
  contacto?: string
}): Promise<{ error?: string }> {
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

export async function deleteNegocio(id: string): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('negocios').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/negocios')
  return {}
}

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
    .insert({
      negocio_id: data.negocio_id,
      fecha: data.fecha,
      nota: data.nota?.trim() || null,
    })
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
  revalidatePath('/admin/negocios')
  return {}
}

export async function deleteNegocioPedido(id: string): Promise<{ error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('negocio_pedidos').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/negocios')
  return {}
}
