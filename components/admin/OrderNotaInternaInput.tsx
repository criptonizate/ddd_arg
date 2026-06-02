'use client'

import { useState, useTransition } from 'react'
import { updateOrderNotaInterna } from '@/lib/actions/orders'
import { useToast } from './ToastProvider'
import { StickyNote, X, Check } from 'lucide-react'

export default function OrderNotaInternaInput({
  orderId,
  notaInterna,
}: {
  orderId: string
  notaInterna: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(notaInterna ?? '')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function save() {
    startTransition(async () => {
      const res = await updateOrderNotaInterna(orderId, value || null)
      if (res?.error) toast(res.error, 'error')
      else {
        toast('Nota guardada ✓')
        setEditing(false)
      }
    })
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        <StickyNote size={12} className="text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Nota interna..."
          className="flex-1 text-xs border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') { setValue(notaInterna ?? ''); setEditing(false) }
          }}
        />
        <button onClick={save} disabled={isPending} className="p-1 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-950/40 transition-colors">
          <Check size={12} />
        </button>
        <button onClick={() => { setValue(notaInterna ?? ''); setEditing(false) }} className="p-1 rounded text-muted-foreground hover:bg-secondary transition-colors">
          <X size={12} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      title="Agregar nota interna"
    >
      <StickyNote size={12} className="shrink-0" />
      {notaInterna ? (
        <span className="italic truncate max-w-[200px] group-hover:underline">🔒 {notaInterna}</span>
      ) : (
        <span className="group-hover:underline opacity-60">+ nota interna</span>
      )}
    </button>
  )
}
