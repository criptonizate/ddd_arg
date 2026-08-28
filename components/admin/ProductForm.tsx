'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createProduct, updateProduct } from '@/lib/actions/products'
import type { ProductWithVariants } from '@/lib/supabase/types'

export const CATEGORIAS = [
  'Religión',
  'Llaveros',
  'Sensorial - Anti stress',
  'Deportes',
  'Hogar',
  'Infantil',
  'Figuras y Personajes',
  'Accesorios',
  'Educación',
  'Personalizado',
  'Gamer',
  'Pastelería - Cortadores',
]

interface Props {
  product?: ProductWithVariants
}

type FormState = { error?: Record<string, string[]> | string; success?: boolean } | undefined

async function submitAction(
  product: ProductWithVariants | undefined,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const categorias = formData.getAll('categorias') as string[]
  const data = {
    nombre: formData.get('nombre') as string,
    descripcion: formData.get('descripcion') as string,
    precio_base: Number(formData.get('precio_base')),
    descuento_mayoreo_pct: Number(formData.get('descuento_mayoreo_pct') ?? 0),
    categoria: categorias[0] ?? '',
    categorias,
    estado: formData.get('estado') as 'activo' | 'pausado',
  }

  if (product) {
    return updateProduct(product.id, data)
  } else {
    return createProduct(data)
  }
}

export default function ProductForm({ product }: Props) {
  const router = useRouter()
  const [selectedCats, setSelectedCats] = useState<string[]>(product?.categorias ?? [])

  const action = submitAction.bind(null, product)
  const [state, formAction, pending] = useActionState(action, undefined)

  useEffect(() => {
    if (!state) return
    if (state.success) {
      if (product) {
        toast.success('Producto guardado correctamente')
      } else {
        router.push('/admin/productos')
      }
    } else if (state.error) {
      toast.error(typeof state.error === 'string' ? state.error : 'Error al guardar el producto')
    }
  }, [state])

  const err = typeof state?.error === 'object' ? state.error : {}
  const serverError = typeof state?.error === 'string' ? state.error : undefined

  return (
    <form action={formAction} className="space-y-5">
      {serverError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5" htmlFor="nombre">
            Nombre <span className="text-destructive">*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            defaultValue={product?.nombre}
            placeholder="Ej: Porta-auriculares"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
          {err.nombre && <p className="text-xs text-destructive mt-1">{err.nombre[0]}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5" htmlFor="descripcion">
            Descripción
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            defaultValue={product?.descripcion ?? ''}
            rows={3}
            placeholder="Descripción del producto..."
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="precio_base">
            Precio base (ARS) <span className="text-destructive">*</span>
          </label>
          <input
            id="precio_base"
            name="precio_base"
            type="number"
            min="0"
            step="1"
            defaultValue={product?.precio_base}
            placeholder="2500"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
          {err.precio_base && (
            <p className="text-xs text-destructive mt-1">{err.precio_base[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="descuento_mayoreo_pct">
            Descuento por volumen (%)
            <span className="ml-1 text-xs font-normal text-muted-foreground">— aplica comprando 3 o más unidades</span>
          </label>
          <input
            id="descuento_mayoreo_pct"
            name="descuento_mayoreo_pct"
            type="number"
            min="0"
            max="99"
            step="1"
            defaultValue={product?.descuento_mayoreo_pct ?? 0}
            placeholder="0"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {err.descuento_mayoreo_pct && (
            <p className="text-xs text-destructive mt-1">{err.descuento_mayoreo_pct[0]}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-2">
            Categorías
            <span className="ml-1 text-xs font-normal text-muted-foreground">— podés elegir más de una</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIAS.map((cat) => {
              const checked = selectedCats.includes(cat)
              return (
                <label
                  key={cat}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors select-none ${
                    checked
                      ? 'border-foreground bg-foreground text-primary-foreground'
                      : 'border-border hover:border-foreground/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="categorias"
                    value={cat}
                    checked={checked}
                    onChange={(e) =>
                      setSelectedCats((prev) =>
                        e.target.checked ? [...prev, cat] : prev.filter((c) => c !== cat)
                      )
                    }
                    className="sr-only"
                  />
                  {cat}
                </label>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="estado">
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={product?.estado ?? 'activo'}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="activo">Activo</option>
            <option value="pausado">Pausado</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors"
        >
          {pending ? 'Guardando...' : product ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  )
}
