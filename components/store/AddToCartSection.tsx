'use client'

import { useState } from 'react'
import { useCart } from './CartProvider'
import { formatARS } from '@/lib/utils'
import type { ProductWithVariants } from '@/lib/supabase/types'
import { ShoppingBag, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AddToCartSection({ product }: { product: ProductWithVariants }) {
  const { addItem } = useCart()
  const router = useRouter()

  const availableVariants = product.product_variants.filter((v) => v.stock > 0)
  const [selectedVariantId, setSelectedVariantId] = useState(availableVariants[0]?.id ?? '')
  const [cantidad, setCantidad] = useState(1)
  const [added, setAdded] = useState(false)

  const selectedVariant = product.product_variants.find((v) => v.id === selectedVariantId)
  const precio = selectedVariant?.precio ?? product.precio_base
  const maxStock = selectedVariant?.stock ?? 0

  function handleAddToCart() {
    if (!selectedVariant) return
    addItem({
      product_id: product.id,
      variant_id: selectedVariant.id,
      nombre: product.nombre,
      variante: selectedVariant.nombre_variante,
      imagen: product.product_images[0]?.url ?? null,
      precio,
      cantidad,
      stock: selectedVariant.stock,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Selector variante */}
      {product.product_variants.length > 1 && (
        <div>
          <p className="text-sm font-medium mb-2">Variante</p>
          <div className="flex flex-wrap gap-2">
            {product.product_variants.map((v) => {
              const sin_stock = v.stock === 0
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    if (!sin_stock) {
                      setSelectedVariantId(v.id)
                      setCantidad(1)
                    }
                  }}
                  disabled={sin_stock}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    selectedVariantId === v.id
                      ? 'bg-foreground text-primary-foreground border-foreground'
                      : sin_stock
                      ? 'border-border text-muted-foreground line-through cursor-not-allowed'
                      : 'border-border hover:border-foreground/40'
                  }`}
                >
                  {v.nombre_variante}
                  {!sin_stock && (
                    <span className="ml-1.5 text-xs opacity-60">({v.stock})</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Precio de la variante */}
      {selectedVariant?.precio && selectedVariant.precio !== product.precio_base && (
        <p className="text-xl font-bold">{formatARS(selectedVariant.precio)}</p>
      )}

      {/* Cantidad */}
      <div>
        <p className="text-sm font-medium mb-2">Cantidad</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            className="w-9 h-9 rounded-lg border border-border hover:bg-secondary transition-colors flex items-center justify-center text-lg font-medium"
          >
            −
          </button>
          <span className="w-10 text-center font-medium">{cantidad}</span>
          <button
            onClick={() => setCantidad((c) => Math.min(maxStock, c + 1))}
            disabled={cantidad >= maxStock}
            className="w-9 h-9 rounded-lg border border-border hover:bg-secondary disabled:opacity-40 transition-colors flex items-center justify-center text-lg font-medium"
          >
            +
          </button>
          <span className="text-xs text-muted-foreground">({maxStock} disponibles)</span>
        </div>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between py-3 border-t border-border">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-lg font-bold">{formatARS(precio * cantidad)}</span>
      </div>

      {/* Botones */}
      <div className="flex gap-3">
        <button
          onClick={handleAddToCart}
          disabled={!selectedVariant || maxStock === 0}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors ${
            added
              ? 'bg-green-600 text-white'
              : 'bg-foreground text-primary-foreground hover:bg-foreground/90'
          } disabled:opacity-40`}
        >
          {added ? (
            <>
              <Check size={16} />
              ¡Agregado!
            </>
          ) : (
            <>
              <ShoppingBag size={16} />
              Agregar al carrito
            </>
          )}
        </button>
        <button
          onClick={() => {
            handleAddToCart()
            router.push('/carrito')
          }}
          disabled={!selectedVariant || maxStock === 0}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-border hover:bg-secondary disabled:opacity-40 transition-colors"
        >
          Comprar
        </button>
      </div>
    </div>
  )
}
