'use client'

import { useTransition } from 'react'
import { confirmOrder, cancelOrder } from '@/lib/actions/orders'
import type { OrderEstado } from '@/lib/supabase/types'
import { Check, X, Package } from 'lucide-react'

interface Props {
  orderId: string
  estado: OrderEstado
}

export default function OrderActions({ orderId, estado }: Props) {
  const [isPending, startTransition] = useTransition()

  if (estado === 'entregada' || estado === 'cancelada') return null

  function handleConfirm() {
    startTransition(async () => {
      await confirmOrder(orderId)
    })
  }

  function handleCancel() {
    if (!confirm('¿Cancelar este pedido? Si ya estaba confirmado, se revertirá el stock.')) return
    startTransition(async () => {
      await cancelOrder(orderId)
    })
  }

  async function handleDeliver() {
    const { updateOrderStatus } = await import('@/lib/actions/orders')
    startTransition(async () => {
      await updateOrderStatus(orderId, 'entregada')
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      {estado === 'pendiente' && (
        <button
          onClick={handleConfirm}
          disabled={isPending}
          title="Confirmar pedido"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Check size={12} />
          Confirmar
        </button>
      )}
      {estado === 'confirmada' && (
        <button
          onClick={handleDeliver}
          disabled={isPending}
          title="Marcar como entregada"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <Package size={12} />
          Entregada
        </button>
      )}
      <button
        onClick={handleCancel}
        disabled={isPending}
        title="Cancelar pedido"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
      >
        <X size={12} />
        Cancelar
      </button>
    </div>
  )
}
