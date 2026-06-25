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
  cliente_nombre: string
  cliente_direccion: string
  cliente_cuit: string
  cliente_telefono: string
  cliente_email: string
  items: PresupuestoItem[]
  descuento_mayorista_pct: number
  nota: string
  created_at: string
}

export async function savePresupuesto(
  data: Omit<PresupuestoRecord, 'id' | 'created_at'>
): Promise<{ ok: boolean; id?: string; error?: string }> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data: row, error } = await supabase
    .from('presupuestos')
    .insert(data)
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/presupuesto')
  return { ok: true, id: row.id }
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
