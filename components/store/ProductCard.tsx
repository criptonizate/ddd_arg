'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ProductWithVariants } from '@/lib/supabase/types'

function fmtARS(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function ProductCard({ product }: { product: ProductWithVariants }) {
  const cover = product.product_images.sort((a, b) => a.orden - b.orden)[0]
  const descuento = product.descuento_mayoreo_pct ?? 0
  const precioConDescuento = product.precio_base * (1 - descuento / 100)

  return (
    <Link
      href={`/producto/${product.id}`}
      className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Imagen */}
      <div className="relative aspect-square bg-secondary overflow-hidden">
        {cover ? (
          <Image
            src={cover.url}
            alt={product.nombre}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl select-none">
            📦
          </div>
        )}
        {descuento > 0 && (
          <span className="absolute top-2 right-2 bg-[var(--brand-orange)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            -{descuento}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1 gap-1">
        <p className="font-semibold text-sm leading-snug line-clamp-2">{product.nombre}</p>
        {product.descripcion && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.descripcion}</p>
        )}

        <div className="mt-auto pt-3">
          <p className="text-base font-bold">$ {fmtARS(product.precio_base)}</p>
          {descuento > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              3 o más: $ {fmtARS(precioConDescuento)} c/u
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
