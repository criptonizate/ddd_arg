'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getAdminUser } from './auth'
import { ProductSchema, VariantSchema } from '@/lib/validations/product'
import type { ProductFormValues, VariantFormValues } from '@/lib/validations/product'

function requireAdmin() {
  // Verificación de admin se hace en el proxy; aquí reforzamos
  return getAdminUser()
}

export async function createProduct(data: ProductFormValues) {
  await requireAdmin()
  const validated = ProductSchema.safeParse(data)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const supabase = createServiceClient()
  const { data: product, error } = await supabase
    .from('products')
    .insert(validated.data)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/productos')
  return { product }
}

export async function updateProduct(id: string, data: ProductFormValues) {
  await requireAdmin()
  const validated = ProductSchema.safeParse(data)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('products')
    .update(validated.data)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/productos')
  revalidatePath(`/admin/productos/${id}`)
  return { success: true }
}

export async function deleteProduct(id: string) {
  await requireAdmin()
  const supabase = createServiceClient()

  // Eliminar imágenes del storage primero
  const { data: images } = await supabase
    .from('product_images')
    .select('url')
    .eq('product_id', id)

  if (images?.length) {
    const paths = images.map((img: any) => {
      const url = new URL(img.url)
      return url.pathname.split('/storage/v1/object/public/productos/')[1]
    }).filter(Boolean)
    if (paths.length) {
      await supabase.storage.from('productos').remove(paths)
    }
  }

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/productos')
  redirect('/admin/productos')
}

export async function getProducts() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variants (*),
      product_images (*)
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getProduct(id: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variants (*),
      product_images (*)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getActiveProducts() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variants (*),
      product_images (*)
    `)
    .eq('estado', 'activo')
    .order('nombre')

  if (error) throw new Error(error.message)
  return data
}

// Variantes
export async function createVariant(productId: string, data: VariantFormValues) {
  await requireAdmin()
  const validated = VariantSchema.safeParse(data)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const supabase = createServiceClient()
  const { data: variant, error } = await supabase
    .from('product_variants')
    .insert({ ...validated.data, product_id: productId })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/admin/productos/${productId}`)
  return { variant }
}

export async function updateVariant(id: string, productId: string, data: VariantFormValues) {
  await requireAdmin()
  const validated = VariantSchema.safeParse(data)
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors }
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('product_variants')
    .update(validated.data)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/admin/productos/${productId}`)
  return { success: true }
}

export async function deleteVariant(id: string, productId: string) {
  await requireAdmin()
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/admin/productos/${productId}`)
  return { success: true }
}

export async function adjustStock(variantId: string, productId: string, newStock: number) {
  await requireAdmin()

  if (newStock < 0) return { error: 'El stock no puede ser negativo' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('product_variants')
    .update({ stock: newStock })
    .eq('id', variantId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/productos/${productId}`)
  revalidatePath('/admin/dashboard')
  return { success: true }
}

// Upload de imagen
export async function uploadProductImage(productId: string, formData: FormData) {
  await requireAdmin()
  const file = formData.get('file') as File
  if (!file) return { error: 'No se encontró archivo' }

  const supabase = createServiceClient()
  const ext = file.name.split('.').pop()
  const path = `${productId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('productos')
    .upload(path, file)

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('productos')
    .getPublicUrl(path)

  // Obtener siguiente orden
  const { data: existingImages } = await supabase
    .from('product_images')
    .select('orden')
    .eq('product_id', productId)
    .order('orden', { ascending: false })
    .limit(1)

  const nextOrder = existingImages?.[0]?.orden != null ? existingImages[0].orden + 1 : 0

  const { error: dbError } = await supabase
    .from('product_images')
    .insert({ product_id: productId, url: publicUrl, orden: nextOrder })

  if (dbError) return { error: dbError.message }

  revalidatePath(`/admin/productos/${productId}`)
  return { url: publicUrl }
}

export async function deleteProductImage(imageId: string, url: string, productId: string) {
  await requireAdmin()
  const supabase = createServiceClient()

  // Extraer path del storage
  const urlObj = new URL(url)
  const pathInStorage = urlObj.pathname.split('/storage/v1/object/public/productos/')[1]
  if (pathInStorage) {
    await supabase.storage.from('productos').remove([pathInStorage])
  }

  const { error } = await supabase.from('product_images').delete().eq('id', imageId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/productos/${productId}`)
  return { success: true }
}
