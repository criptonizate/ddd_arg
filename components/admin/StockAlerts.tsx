'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check } from 'lucide-react'
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
  const [copiado, setCopiado] = useState(false)

  async function copiarLista() {
    const texto = variants
      .map((v) => `• ${v.product_nombre} — ${v.nombre_variante} · ${v.stock} uds.`)
      .join('\n')
    try {
      await navigator.clipboard.writeText(`Reponer stock:\n${texto}`)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch (err) {
      console.error('[StockAlerts] copy failed', err)
    }
  }

  return (
    <div className="space-y-3">
      {variants.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={copiarLista}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
            title="Copiar al portapapeles para pedirle al proveedor"
          >
            {copiado ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
            {copiado ? 'Copiado' : 'Copiar lista p/ proveedor'}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {variants.map((v) => (
          <Link
            key={v.id}
            href={`/admin/productos/${v.product_id}`}
            className="flex items-center justify-between bg-card border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-200 truncate">
                {v.product_nombre}
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-400 truncate">{v.nombre_variante}</p>
            </div>
            <span className="ml-2 shrink-0 text-sm font-bold text-[var(--brand-orange)]">
              {v.stock} uds.
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
