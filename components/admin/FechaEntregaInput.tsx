'use client'

import { useState, useTransition } from 'react'
import { updateOrderFechaEntrega } from '@/lib/actions/orders'

function getDiasLabel(fechaStr: string): { label: string; color: string } {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const entrega = new Date(fechaStr + 'T00:00:00')
  const dias = Math.round((entrega.getTime() - hoy.getTime()) / 86400000)
  const label =
    dias === 0 ? '¡hoy!' :
    dias === 1 ? 'mañana' :
    dias < 0 ? `hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}` :
    `quedan ${dias} días`
  const color = dias < 0 ? 'text-red-600' : dias <= 2 ? 'text-orange-500' : 'text-foreground'
  return { label, color }
}

export default function FechaEntregaInput({
  orderId,
  fechaEntrega,
}: {
  orderId: string
  fechaEntrega: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(fechaEntrega ?? '')
  const [current, setCurrent] = useState(fechaEntrega)
  const [isPending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      await updateOrderFechaEntrega(orderId, value || null)
      setCurrent(value || null)
      setEditing(false)
    })
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">📅</span>
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="text-xs border border-input rounded px-2 py-1 bg-background"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
        <button onClick={save} disabled={isPending} className="text-xs text-green-600 font-medium hover:underline">
          {isPending ? '...' : 'OK'}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:underline">✕</button>
      </div>
    )
  }

  if (!current) {
    return (
      <button
        onClick={() => { setValue(''); setEditing(true) }}
        className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
      >
        + Fecha de entrega
      </button>
    )
  }

  const { label, color } = getDiasLabel(current)
  const fecha = new Date(current + 'T00:00:00')

  return (
    <button
      onClick={() => { setValue(current); setEditing(true) }}
      className="group text-left"
      title="Editar fecha de entrega"
    >
      <span className="text-xs text-muted-foreground block">Entrega pactada</span>
      <span className={`text-sm font-semibold group-hover:underline ${color}`}>
        📅 {fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
        <span className="font-normal text-xs ml-1">({label})</span>
      </span>
    </button>
  )
}
