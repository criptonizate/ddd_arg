'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'

export interface OrderEvent {
  id: string
  order_id: string
  tipo: string
  descripcion: string
  created_at: string
}

export async function addOrderEvent(
  orderId: string,
  descripcion: string,
  tipo = 'nota'
): Promise<{ ok: boolean; error?: string }> {
  await getAdminUser()
  if (!descripcion.trim()) return { ok: false, error: 'La descripción no puede estar vacía' }
  const supabase = createServiceClient()
  const { error } = await supabase.from('order_events').insert({ order_id: orderId, tipo, descripcion: descripcion.trim() })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/ventas')
  revalidatePath('/admin/pedidos')
  return { ok: true }
}

export async function getOrderEvents(orderId: string): Promise<OrderEvent[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('order_events')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
  return (data ?? []) as OrderEvent[]
}

export async function deleteOrderEvent(id: string): Promise<{ ok: boolean }> {
  await getAdminUser()
  const supabase = createServiceClient()
  await supabase.from('order_events').delete().eq('id', id)
  revalidatePath('/admin/ventas')
  revalidatePath('/admin/pedidos')
  return { ok: true }
}
