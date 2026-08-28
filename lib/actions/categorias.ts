'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Categoria {
  id: string
  nombre: string
}

export async function getCategorias(): Promise<Categoria[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('product_categories')
    .select('id, nombre')
    .order('nombre')
  return (data ?? []) as Categoria[]
}

export async function createCategoria(nombre: string): Promise<{ error?: string }> {
  const n = nombre.trim()
  if (!n) return { error: 'El nombre no puede estar vacío' }
  const supabase = createServiceClient()
  const { error } = await supabase.from('product_categories').insert({ nombre: n })
  if (error) return { error: 'Ya existe una categoría con ese nombre' }
  revalidatePath('/admin/productos')
  return {}
}

export async function renameCategoria(id: string, nombreViejo: string, nombreNuevo: string): Promise<{ error?: string }> {
  const n = nombreNuevo.trim()
  if (!n) return { error: 'El nombre no puede estar vacío' }
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('product_categories')
    .update({ nombre: n })
    .eq('id', id)
  if (error) return { error: 'Ya existe una categoría con ese nombre' }

  // Actualizar todos los productos que tenían el nombre viejo
  const { data: products } = await supabase
    .from('products')
    .select('id, categorias')
    .contains('categorias', [nombreViejo])

  for (const p of products ?? []) {
    const nuevas = (p.categorias as string[]).map((c: string) => c === nombreViejo ? n : c)
    await supabase.from('products').update({ categorias: nuevas, categoria: nuevas[0] ?? '' }).eq('id', p.id)
  }

  revalidatePath('/admin/productos')
  revalidatePath('/catalogo')
  return {}
}

export async function deleteCategoria(id: string, nombre: string): Promise<{ error?: string }> {
  const supabase = createServiceClient()

  const { error } = await supabase.from('product_categories').delete().eq('id', id)
  if (error) return { error: error.message }

  // Quitar la categoría de todos los productos que la tenían
  const { data: products } = await supabase
    .from('products')
    .select('id, categorias')
    .contains('categorias', [nombre])

  for (const p of products ?? []) {
    const nuevas = (p.categorias as string[]).filter((c: string) => c !== nombre)
    await supabase.from('products').update({ categorias: nuevas, categoria: nuevas[0] ?? '' }).eq('id', p.id)
  }

  revalidatePath('/admin/productos')
  revalidatePath('/catalogo')
  return {}
}
