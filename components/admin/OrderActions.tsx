'use client'

import { useTransition } from 'react'
import { confirmOrder, cancelOrder, markOrderListo, markOrderImprimiendo, updateOrderStatus } from '@/lib/actions/orders'
import { useConfirm } from './ConfirmModal'
import { useToast } from './ToastProvider'
import type { OrderEstado } from '@/lib/supabase/types'
import { Check, X, Package, Boxes, Store, Printer } from 'lucide-react'

interface Props {
  orderId: string
  estado: OrderEstado
}

export default function OrderActions({ orderId, estado }: Props) {
  const [isPending, startTransition] = useTransition()
  const { confirm, ConfirmDialog } = useConfirm()
  const { toast } = useToast()

  if (estado === 'entregada' || estado === 'cancelada' || estado === 'local') return null

  async function handleConfirm() {
    const ok = await confirm('¿Confirmar este pedido? Se descontará el stock.')
    if (!ok) return
    startTransition(async () => {
      const res = await confirmOrder(orderId)
      if (res?.error) toast(res.error, 'error')
      else toast('Pedido confirmado ✓')
    })
  }

  function handleImprimiendo() {
    startTransition(async () => {
      const res = await markOrderImprimiendo(orderId)
      if (res?.error) toast(res.error, 'error')
      else toast('En impresión 🖨️')
    })
  }

  function handleListo() {
    startTransition(async () => {
      const res = await markOrderListo(orderId)
      if (res?.error) toast(res.error, 'error')
      else toast('Marcado como listo ✓')
    })
  }

  function handleDeliver() {
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, 'entregada')
      if (res?.error) toast(res.error, 'error')
      else toast('Pedido entregado ✓')
    })
  }

  function handleLocal() {
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, 'local')
      if (res?.error) toast(res.error, 'error')
      else toast('Movido a ventas del local ✓')
    })
  }

  async function handleCancel() {
    const ok = await confirm(
      '¿Cancelar este pedido? Si ya estaba confirmado, se revertirá el stock.',
      { confirmLabel: 'Sí, cancelar', destructive: true }
    )
    if (!ok) return
    startTransition(async () => {
      const res = await cancelOrder(orderId)
      if (res?.error) toast(res.error, 'error')
      else toast('Pedido cancelado', 'info')
    })
  }

  return (
    <>
      {ConfirmDialog}
      <div className="flex items-center gap-1.5 flex-wrap">
        {estado === 'pendiente' && (
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Check size={12} /> Confirmar
          </button>
        )}
        {estado === 'confirmada' && (
          <button
            onClick={handleImprimiendo}
            disabled={isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50 transition-colors"
          >
            <Printer size={12} /> Imprimir
          </button>
        )}
        {(estado === 'confirmada' || estado === 'imprimiendo') && (
          <button
            onClick={handleListo}
            disabled={isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <Boxes size={12} /> Listo
          </button>
        )}
        {estado === 'listo' && (
          <button
            onClick={handleImprimiendo}
            disabled={isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-cyan-500 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 disabled:opacity-50 transition-colors"
          >
            <Printer size={12} /> Reimprimir
          </button>
        )}
        {(estado === 'confirmada' || estado === 'imprimiendo' || estado === 'listo') && (
          <button
            onClick={handleDeliver}
            disabled={isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Package size={12} /> Entregado
          </button>
        )}
        {(estado === 'confirmada' || estado === 'imprimiendo' || estado === 'listo') && (
          <button
            onClick={handleLocal}
            disabled={isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            <Store size={12} /> Local
          </button>
        )}
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
        >
          <X size={12} /> Cancelar
        </button>
      </div>
    </>
  )
}
