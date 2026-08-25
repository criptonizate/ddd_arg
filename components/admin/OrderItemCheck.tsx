'use client'

import { useState, useTransition } from 'react'
import { toggleOrderItemImpreso, updateOrderItemCantidadImpresa } from '@/lib/actions/orders'
import { useToast } from './ToastProvider'
import { Minus, Plus } from 'lucide-react'

export default function OrderItemCheck({
  itemId,
  impreso,
  cantidad = 1,
  cantidadImpresa = 0,
}: {
  itemId: string
  impreso: boolean
  cantidad?: number
  cantidadImpresa?: number
}) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  // Caso simple: 1 unidad → checkbox
  if (cantidad <= 1) {
    return (
      <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none shrink-0">
        <input
          type="checkbox"
          checked={impreso}
          onChange={() => startTransition(async () => {
            const res = await toggleOrderItemImpreso(itemId, !impreso)
            if (res?.error) toast(res.error, 'error')
          })}
          disabled={isPending}
          className="w-4 h-4 rounded accent-foreground cursor-pointer disabled:opacity-50"
        />
        <span className={impreso ? 'text-green-600' : 'text-muted-foreground'}>
          {impreso ? 'Impreso' : 'Pendiente'}
        </span>
      </label>
    )
  }

  return <MultiCounter itemId={itemId} cantidad={cantidad} cantidadImpresa={cantidadImpresa} isPending={isPending} startTransition={startTransition} toast={toast} />
}

function MultiCounter({
  itemId,
  cantidad,
  cantidadImpresa,
  isPending,
  startTransition,
  toast,
}: {
  itemId: string
  cantidad: number
  cantidadImpresa: number
  isPending: boolean
  startTransition: (fn: () => void) => void
  toast: (msg: string, type?: 'error' | 'success' | 'info') => void
}) {
  const [inputVal, setInputVal] = useState('')
  const [editando, setEditando] = useState(false)

  function guardar(valor: number) {
    const nuevo = Math.max(0, Math.min(cantidad, valor))
    startTransition(async () => {
      const res = await updateOrderItemCantidadImpresa(itemId, nuevo, cantidad)
      if (res?.error) toast(res.error, 'error')
    })
  }

  function cambiar(delta: number) {
    guardar(cantidadImpresa + delta)
  }

  function handleInputBlur() {
    setEditando(false)
    const n = parseInt(inputVal)
    if (!isNaN(n)) guardar(n)
    setInputVal('')
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      setEditando(false)
      setInputVal('')
    }
  }

  const completo = cantidadImpresa >= cantidad

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={() => cambiar(-1)}
        disabled={isPending || cantidadImpresa <= 0}
        className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 transition-colors"
      >
        <Minus size={10} />
      </button>

      {editando ? (
        <input
          type="number"
          min={0}
          max={cantidad}
          autoFocus
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          disabled={isPending}
          className="w-14 text-xs font-bold text-center tabular-nums border border-ring rounded px-1 py-0.5 bg-background focus:outline-none"
        />
      ) : (
        <button
          onClick={() => { setEditando(true); setInputVal(String(cantidadImpresa)) }}
          title="Hacer clic para ingresar cantidad exacta"
          className={`text-xs font-bold w-10 text-center tabular-nums rounded hover:bg-secondary transition-colors px-0.5 ${completo ? 'text-green-600' : cantidadImpresa > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'}`}
        >
          {cantidadImpresa}/{cantidad}
        </button>
      )}

      <button
        onClick={() => cambiar(+1)}
        disabled={isPending || cantidadImpresa >= cantidad}
        className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 transition-colors"
      >
        <Plus size={10} />
      </button>

      <span className={`text-xs font-medium ${completo ? 'text-green-600' : cantidadImpresa > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'}`}>
        {completo ? 'Listo' : cantidadImpresa > 0 ? 'En progreso' : 'Pendiente'}
      </span>
    </div>
  )
}
