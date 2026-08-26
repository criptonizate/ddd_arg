'use client'

import { useState, useTransition } from 'react'
import { updateOrderConsignacion } from '@/lib/actions/orders'
import { useToast } from './ToastProvider'

export default function ConsignacionToggle({
  orderId,
  esConsignacion,
  diasDevolucion,
}: {
  orderId: string
  esConsignacion: boolean
  diasDevolucion: number
}) {
  const [activo, setActivo] = useState(esConsignacion)
  const [dias, setDias] = useState(diasDevolucion)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function guardar(nuevoActivo: boolean, nuevosDias: number) {
    startTransition(async () => {
      const res = await updateOrderConsignacion(orderId, nuevoActivo, nuevosDias)
      if (res?.error) toast(res.error, 'error')
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-muted-foreground shrink-0">Consignación:</label>
        <button
          type="button"
          onClick={() => {
            const nuevo = !activo
            setActivo(nuevo)
            guardar(nuevo, dias)
          }}
          disabled={isPending}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
            activo
              ? 'bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-300'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${activo ? 'bg-amber-500 border-amber-500' : 'border-current'}`} />
          {activo ? 'En consignación' : 'Marcar consignación'}
        </button>
        {activo && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Plazo:</span>
            <input
              type="number"
              min={1}
              max={90}
              value={dias}
              onChange={(e) => {
                const v = Math.max(1, parseInt(e.target.value) || 15)
                setDias(v)
              }}
              onBlur={() => guardar(activo, dias)}
              disabled={isPending}
              className="w-14 text-xs border border-input rounded px-1.5 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring text-center"
            />
            <span className="text-xs text-muted-foreground">días</span>
          </div>
        )}
      </div>
    </div>
  )
}
