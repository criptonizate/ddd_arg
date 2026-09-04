'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'

export interface PresupuestoItem {
  descripcion: string
  unidades: number
  precio: number
  precioEspecial?: number
}

export interface PresupuestoRecord {
  id: string
  numero?: number
  cliente_nombre: string
  cliente_direccion: string
  cliente_cuit: string
  cliente_telefono: string
  cliente_email: string
  items: PresupuestoItem[]
  descuento_mayorista_pct: number
  nota: string
  condiciones_pago?: string
  tiempo_entrega?: string
  created_at: string
}

export async function savePresupuesto(
  data: Omit<PresupuestoRecord, 'id' | 'created_at'>
): Promise<{ ok: boolean; id?: string; numero?: number; error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data: row, error } = await supabase
    .from('presupuestos')
    .insert(data)
    .select('id, numero')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/presupuesto')
  return { ok: true, id: row.id, numero: row.numero }
}

export async function getPresupuestos(): Promise<PresupuestoRecord[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('presupuestos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []) as PresupuestoRecord[]
}

export async function getPresupuesto(id: string): Promise<PresupuestoRecord | null> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase.from('presupuestos').select('*').eq('id', id).single()
  return data as PresupuestoRecord | null
}

export async function deletePresupuesto(id: string): Promise<{ ok: boolean }> {
  await getAdminUser()
  const supabase = createServiceClient()
  await supabase.from('presupuestos').delete().eq('id', id)
  revalidatePath('/admin/presupuesto')
  return { ok: true }
}

export async function duplicatePresupuesto(id: string): Promise<{ ok: boolean; error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data: original } = await supabase.from('presupuestos').select('*').eq('id', id).single()
  if (!original) return { ok: false, error: 'No encontrado' }
  const { id: _id, created_at: _ca, numero: _n, ...rest } = original
  const { error } = await supabase.from('presupuestos').insert({
    ...rest,
    cliente_nombre: rest.cliente_nombre ? `${rest.cliente_nombre} (copia)` : '(copia)',
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/presupuesto')
  return { ok: true }
}
