'use client'

import { useState, useTransition } from 'react'
import { updateOrderSena } from '@/lib/actions/orders'
import { formatARS } from '@/lib/utils'

export default function OrderSenaInput({
  orderId,
  sena,
  total,
}: {
  orderId: string
  sena: number
  total: number
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(sena)
  const [isPending, startTransition] = useTransition()
  const pendiente = total - sena

  function save() {
    startTransition(async () => {
      await updateOrderSena(orderId, value)
      setEditing(false)
    })
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Seña:</span>
        <input
          type="number"
          min="0"
          max={total}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-24 text-xs border border-input rounded px-2 py-1 bg-background"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
        <button
          onClick={save}
          disabled={isPending}
          className="text-xs text-green-600 font-medium hover:underline"
        >
          {isPending ? '...' : 'OK'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-muted-foreground hover:underline"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 text-sm flex-wrap">
      <button
        onClick={() => {
          setValue(sena)
          setEditing(true)
        }}
        className="flex items-center gap-1 group"
        title="Editar seña"
      >
        <span className="text-xs text-muted-foreground">Seña:</span>
        <span
          className={`font-medium group-hover:underline ${
            sena > 0 ? 'text-green-600' : 'text-muted-foreground'
          }`}
        >
          {sena > 0 ? formatARS(sena) : '—'}
        </span>
      </button>
      {pendiente > 0 && sena > 0 && (
        <span className="text-xs">
          <span className="text-muted-foreground">Pendiente: </span>
          <span className="font-semibold text-orange-600">{formatARS(pendiente)}</span>
        </span>
      )}
      {sena >= total && total > 0 && (
        <span className="text-xs font-medium text-green-600">✓ Pagado</span>
      )}
    </div>
  )
}
