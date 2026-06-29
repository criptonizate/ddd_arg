'use client'

import { useTransition } from 'react'
import { toggleOrderItemImpreso } from '@/lib/actions/orders'
import { useToast } from './ToastProvider'

export default function OrderItemCheck({
  itemId,
  impreso,
}: {
  itemId: string
  impreso: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleToggle() {
    startTransition(async () => {
      const res = await toggleOrderItemImpreso(itemId, !impreso)
      if (res?.error) toast(res.error, 'error')
    })
  }

  return (
    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none shrink-0">
      <input
        type="checkbox"
        checked={impreso}
        onChange={handleToggle}
        disabled={isPending}
        className="w-4 h-4 rounded accent-foreground cursor-pointer disabled:opacity-50"
      />
      <span className={impreso ? 'text-green-600' : 'text-muted-foreground'}>
        {impreso ? 'Impreso' : 'Pendiente'}
      </span>
    </label>
  )
}
