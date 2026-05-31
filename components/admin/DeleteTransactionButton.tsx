'use client'

import { useTransition } from 'react'
import { deleteTransaction } from '@/lib/actions/finance'
import { Trash2 } from 'lucide-react'

export default function DeleteTransactionButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('¿Eliminar esta transacción?')) return
    startTransition(async () => {
      await deleteTransaction(id)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40"
      title="Eliminar"
    >
      <Trash2 size={13} />
    </button>
  )
}
