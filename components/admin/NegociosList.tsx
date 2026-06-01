'use client'

import { useState, useTransition } from 'react'
import { formatARS } from '@/lib/utils'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import NuevoPedidoNegocioButton from './NuevoPedidoNegocioButton'
import { deleteNegocio, deleteNegocioPedido } from '@/lib/actions/negocios'
import type { Negocio } from '@/lib/actions/negocios'

function pedidoTotal(pedido: Negocio['negocio_pedidos'][number]) {
  return pedido.negocio_items.reduce((s, i) => s + Number(i.precio_mayorista) * i.cantidad, 0)
}

function negocioTotal(negocio: Negocio) {
  return negocio.negocio_pedidos.reduce((s, p) => s + pedidoTotal(p), 0)
}

function formatFecha(fecha: string) {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(fecha + 'T12:00:00')
  )
}

function PedidoRow({ pedido, negocioId }: { pedido: Negocio['negocio_pedidos'][number]; negocioId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const total = pedidoTotal(pedido)

  function handleDelete() {
    if (!confirm('¿Eliminar este pedido?')) return
    startTransition(async () => { await deleteNegocioPedido(pedido.id) })
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium">{formatFecha(pedido.fecha)}</span>
          <span className="text-xs text-muted-foreground">
            {pedido.negocio_items.length} producto{pedido.negocio_items.length !== 1 ? 's' : ''}
          </span>
          {pedido.nota && (
            <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">— {pedido.nota}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-semibold text-sm">{formatARS(total)}</span>
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="text-left pb-2 font-medium">Producto</th>
                <th className="text-right pb-2 font-medium">Precio may.</th>
                <th className="text-right pb-2 font-medium">Cant.</th>
                <th className="text-right pb-2 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pedido.negocio_items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1.5 font-medium">{item.nombre_producto}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{formatARS(item.precio_mayorista)}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{item.cantidad}</td>
                  <td className="py-1.5 text-right font-semibold">{formatARS(Number(item.precio_mayorista) * item.cantidad)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-2 text-xs text-muted-foreground text-right">Total del pedido</td>
                <td className="pt-2 text-right font-bold">{formatARS(total)}</td>
              </tr>
            </tfoot>
          </table>
          <div className="flex justify-end pt-1">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-destructive hover:underline disabled:opacity-50"
            >
              <Trash2 size={12} /> Eliminar pedido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function NegocioCard({ negocio }: { negocio: Negocio }) {
  const [isPending, startTransition] = useTransition()
  const total = negocioTotal(negocio)

  function handleDeleteNegocio() {
    if (!confirm(`¿Eliminar "${negocio.nombre}" y todos sus pedidos?`)) return
    startTransition(async () => { await deleteNegocio(negocio.id) })
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm">
      {/* Header del negocio */}
      <div className="flex items-center justify-between gap-3 p-5 border-b border-border flex-wrap">
        <div>
          <h3 className="font-semibold text-base">{negocio.nombre}</h3>
          {negocio.contacto && (
            <p className="text-xs text-muted-foreground mt-0.5">{negocio.contacto}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total entregado</p>
            <p className="font-bold">{formatARS(total)}</p>
          </div>
          <div className="flex items-center gap-2">
            <NuevoPedidoNegocioButton negocioId={negocio.id} negocioNombre={negocio.nombre} />
            <button
              onClick={handleDeleteNegocio}
              disabled={isPending}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              title="Eliminar negocio"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Pedidos */}
      <div className="p-4 space-y-2">
        {negocio.negocio_pedidos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sin pedidos aún — cargá el primero con el botón de arriba
          </p>
        ) : (
          negocio.negocio_pedidos.map((pedido) => (
            <PedidoRow key={pedido.id} pedido={pedido} negocioId={negocio.id} />
          ))
        )}
      </div>
    </div>
  )
}

export default function NegociosList({ negocios }: { negocios: Negocio[] }) {
  if (negocios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
        <p className="text-2xl mb-2">🏪</p>
        <p className="font-medium">Sin negocios todavía</p>
        <p className="text-sm text-muted-foreground mt-1">Agregá el primer negocio con el botón de arriba</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {negocios.map((negocio) => (
        <NegocioCard key={negocio.id} negocio={negocio} />
      ))}
    </div>
  )
}
