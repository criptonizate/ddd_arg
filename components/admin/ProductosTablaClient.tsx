'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { formatARS } from '@/lib/utils'
import { patchProduct, adjustStock } from '@/lib/actions/products'
import type { ProductWithVariants } from '@/lib/supabase/types'

const CATEGORIAS = [
  'Religión',
  'Sensorial - Anti stress',
  'Deportes',
  'Hogar',
  'Infantil',
  'Figuras y Personajes',
  'Accesorios',
  'Educación',
  'Personalizado',
]

const ESTADO_LABELS: Record<string, string> = {
  activo: 'Activo',
  pausado: 'Pausado',
  agotado: 'Agotado',
  archivado: 'Archivado',
}

function CategoriaCell({ product }: { product: ProductWithVariants }) {
  const [value, setValue] = useState(product.categoria ?? '')
  const [, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    setValue(next)
    startTransition(() => patchProduct(product.id, { categoria: next }))
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      className="w-full bg-transparent border border-transparent hover:border-input focus:border-input rounded-md px-1.5 py-1 text-sm text-muted-foreground focus:text-foreground focus:outline-none transition-colors cursor-pointer"
    >
      <option value="">Sin categoría</option>
      {CATEGORIAS.map((cat) => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
    </select>
  )
}

function PrecioCell({ product }: { product: ProductWithVariants }) {
  const [value, setValue] = useState(String(product.precio_base))
  const [saved, setSaved] = useState(true)
  const [, startTransition] = useTransition()

  function handleBlur() {
    const num = Number(value)
    if (isNaN(num) || num < 0) { setValue(String(product.precio_base)); return }
    setSaved(false)
    startTransition(async () => {
      await patchProduct(product.id, { precio_base: num })
      setSaved(true)
    })
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground text-xs">$</span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        className={`w-24 bg-transparent border border-transparent hover:border-input focus:border-input rounded-md px-1.5 py-1 text-sm focus:outline-none transition-colors ${saved ? '' : 'opacity-60'}`}
      />
    </div>
  )
}

function StockCell({ product }: { product: ProductWithVariants }) {
  const variants = product.product_variants
  const totalStock = variants.reduce((s, v) => s + v.stock, 0)
  const hasLowStock = variants.some((v) => v.stock <= v.stock_minimo)

  if (variants.length !== 1) {
    return (
      <span className="flex items-center gap-1.5 text-sm">
        {totalStock}
        {hasLowStock && <AlertTriangle size={13} className="text-[var(--brand-orange)]" />}
        {variants.length > 1 && (
          <Link href={`/admin/productos/${product.id}`} className="text-muted-foreground hover:text-foreground">
            <ExternalLink size={12} />
          </Link>
        )}
      </span>
    )
  }

  const variant = variants[0]
  const [value, setValue] = useState(String(variant.stock))
  const [, startTransition] = useTransition()

  function handleBlur() {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < 0) { setValue(String(variant.stock)); return }
    startTransition(() => { adjustStock(variant.id, product.id, num) })
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        className="w-16 bg-transparent border border-transparent hover:border-input focus:border-input rounded-md px-1.5 py-1 text-sm focus:outline-none transition-colors"
      />
      {variant.stock <= variant.stock_minimo && (
        <AlertTriangle size={13} className="text-[var(--brand-orange)]" />
      )}
    </div>
  )
}

function EstadoCell({ product }: { product: ProductWithVariants }) {
  const [estado, setEstado] = useState(product.estado)
  const [, startTransition] = useTransition()

  function toggle() {
    const next = estado === 'activo' ? 'pausado' : 'activo'
    setEstado(next as typeof estado)
    startTransition(() => patchProduct(product.id, { estado: next as 'activo' | 'pausado' }))
  }

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
        estado === 'activo'
          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600'
      }`}
    >
      {ESTADO_LABELS[estado] ?? estado}
    </button>
  )
}

export default function ProductosTablaClient({ products }: { products: ProductWithVariants[] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Producto</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Categoría</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Precio base</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Stock</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-2.5 font-medium">{product.nombre}</td>
                <td className="px-3 py-2 hidden sm:table-cell">
                  <CategoriaCell product={product} />
                </td>
                <td className="px-3 py-2">
                  <PrecioCell product={product} />
                </td>
                <td className="px-3 py-2 hidden md:table-cell">
                  <StockCell product={product} />
                </td>
                <td className="px-3 py-2">
                  <EstadoCell product={product} />
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/productos/${product.id}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Editar →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
