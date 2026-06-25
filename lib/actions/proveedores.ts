'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'

export interface Proveedor {
  id: string
  nombre: string
  contacto: string
  email: string
  telefono: string
  nota: string
  created_at: string
}

export interface ProveedorCompra {
  id: string
  proveedor_id: string
  descripcion: string
  categoria: string
  monto: number
  fecha: string
  nota: string
  created_at: string
}

export async function getProveedores(): Promise<Proveedor[]> {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data } = await supabase.from('proveedores').select('*').order('nombre')
  return (data ?? []) as Proveedor[]
}

export async function getProveedor(id: string): Promise<(Proveedor & { compras: ProveedorCompra[] }) | null> {
  await getAdminUser()
  const supabase = createServiceClient()
  const [{ data: prov }, { data: compras }] = await Promise.all([
    supabase.from('proveedores').select('*').eq('id', id).single(),
    supabase.from('proveedor_compras').select('*').eq('proveedor_id', id).order('fecha', { ascending: false }),
  ])
  if (!prov) return null
  return { ...(prov as Proveedor), compras: (compras ?? []) as ProveedorCompra[] }
}

export async function createProveedor(data: { nombre: string; contacto?: string; email?: string; telefono?: string; nota?: string }) {
  await getAdminUser()
  const supabase = createServiceClient()
  const { data: row, error } = await supabase.from('proveedores').insert({
    nombre: data.nombre.trim(),
    contacto: data.contacto ?? '',
    email: data.email ?? '',
    telefono: data.telefono ?? '',
    nota: data.nota ?? '',
  }).select().single()
  if (error) return { error: error.message }
  revalidatePath('/admin/proveedores')
  return { proveedor: row }
}

export async function updateProveedor(id: string, data: Partial<Omit<Proveedor, 'id' | 'created_at'>>) {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('proveedores').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/proveedores')
  revalidatePath(`/admin/proveedores/${id}`)
  return { success: true }
}

export async function deleteProveedor(id: string) {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('proveedores').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/proveedores')
  return { success: true }
}

export async function createProveedorCompra(data: {
  proveedor_id: string
  descripcion: string
  categoria: string
  monto: number
  fecha: string
  nota?: string
}) {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('proveedor_compras').insert({ ...data, nota: data.nota ?? '' })
  if (error) return { error: error.message }
  revalidatePath(`/admin/proveedores/${data.proveedor_id}`)
  return { success: true }
}

export async function deleteProveedorCompra(id: string, proveedorId: string) {
  await getAdminUser()
  const supabase = createServiceClient()
  const { error } = await supabase.from('proveedor_compras').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/proveedores/${proveedorId}`)
  return { success: true }
}
