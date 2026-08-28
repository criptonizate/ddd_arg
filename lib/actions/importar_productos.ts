'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ProductoImport {
  nombre: string
  descripcion: string
  categorias: string[]
  precio_base: number
  descuento_mayoreo_pct: number
  variante: string
  stock: number
  estado: 'activo' | 'pausado'
}

export async function importarProductos(productos: ProductoImport[]) {
  const supabase = createServiceClient()

  for (const p of productos) {
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        nombre: p.nombre,
        descripcion: p.descripcion,
        categoria: p.categorias[0] ?? '',
        categorias: p.categorias,
        precio_base: p.precio_base,
        descuento_mayoreo_pct: p.descuento_mayoreo_pct,
        estado: p.estado,
      })
      .select('id')
      .single()

    if (error || !product) continue

    await supabase.from('product_variants').insert({
      product_id: product.id,
      nombre_variante: p.variante || 'Único',
      stock: p.stock,
      stock_minimo: 3,
    })
  }

  revalidatePath('/admin/productos')
  revalidatePath('/catalogo')
}
