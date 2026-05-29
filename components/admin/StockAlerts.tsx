import Link from 'next/link'
import type { ProductVariant } from '@/lib/supabase/types'

interface StockAlertVariant extends ProductVariant {
  product_nombre: string
  product_id: string
}

export default function StockAlerts({
  variants,
}: {
  variants: StockAlertVariant[]
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {variants.map((v) => (
        <Link
          key={v.id}
          href={`/admin/productos/${v.product_id}`}
          className="flex items-center justify-between bg-white border border-orange-200 rounded-lg px-3 py-2 hover:border-orange-300 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-orange-900 truncate">
              {v.product_nombre}
            </p>
            <p className="text-xs text-orange-700 truncate">{v.nombre_variante}</p>
          </div>
          <span className="ml-2 shrink-0 text-sm font-bold text-[var(--brand-orange)]">
            {v.stock} uds.
          </span>
        </Link>
      ))}
    </div>
  )
}
