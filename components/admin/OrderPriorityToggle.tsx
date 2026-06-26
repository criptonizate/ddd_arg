'use client'

import { useTransition } from 'react'
import { toggleOrderPriority } from '@/lib/actions/orders'
import { AlertTriangle } from 'lucide-react'

export default function OrderPriorityToggle({
  orderId,
  prioridad,
}: {
  orderId: string
  prioridad: boolean
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => { startTransition(() => { toggleOrderPriority(orderId, !prioridad) }) }}
      disabled={isPending}
      title={prioridad ? 'Quitar urgencia' : 'Marcar como urgente'}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
        prioridad
          ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900/50'
          : 'bg-secondary text-muted-foreground border-border hover:border-foreground/30'
      }`}
    >
      <AlertTriangle size={10} />
      {prioridad ? '🔥 Urgente' : '😌 Normal'}
    </button>
  )
}
