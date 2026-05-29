'use client'

import { useTransition } from 'react'
import { deleteProduct } from '@/lib/actions/products'
import { Trash2 } from 'lucide-react'

export default function DeleteProductButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('¿Eliminar este producto y todas sus variantes? Esta acción no se puede deshacer.'))
      return
    startTransition(async () => {
      await deleteProduct(productId)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
    >
      <Trash2 size={14} />
      {isPending ? 'Eliminando...' : 'Eliminar'}
    </button>
  )
}
