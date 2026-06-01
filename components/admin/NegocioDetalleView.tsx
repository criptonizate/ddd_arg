'use client'

import { useState, useTransition } from 'react'
import { formatARS } from '@/lib/utils'
import { ChevronDown, ChevronUp, Trash2, Plus, X, Check } from 'lucide-react'
import {
  markPedidoEntregado,
  deleteNegocioPedido,
  addItemsToPedido,
  deleteNegocioItem,
} from '@/lib/actions/negocios'
import type { Negocio, NegocioPedido } from '@/lib/actions/negocios'

function formatFecha(fecha: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(fecha + 'T12:00:00'))
}

function pedidoTotal(pedido: NegocioPedido) {
  return pedido.negocio_items.reduce((s, i) => s + Number(i.precio_mayorista) * i.cantidad, 0)
}

// ── Modal: Cargar egreso (marcar como entregado) ───────────────────────────

function EgresoModal({
  pedido,
  negocioId,
  onClose,
}: {
  pedido: NegocioPedido
  negocioId: string
  onClose: () => void
}) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    startTransition(async () => {
      const res = await markPedidoEntregado(pedido.id, negocioId, fecha)
      if (res?.error) { setError(res.error); return }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">✅ Cargar egreso</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-sm text-muted-foreground">
            Confirmá que los productos del pedido del <strong>{formatFecha(pedido.fecha)}</strong> fueron entregados.
          </p>
          <div>
            <label className="text-xs font-medium mb-1 block">📅 Fecha de entrega</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="text-sm space-y-1 bg-secondary/30 rounded-lg p-3">
            {pedido.negocio_items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.nombre_producto} <span className="text-muted-foreground">× {item.cantidad}</span></span>
                <span className="font-medium">{formatARS(Number(item.precio_mayorista) * item.cantidad)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-1 mt-1 font-bold">
              <span>Total</span>
              <span>{formatARS(pedidoTotal(pedido))}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Guardando...' : 'Confirmar entrega'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Agregar items a un pedido existente ─────────────────────────────

function AgregarItemsModal({
  pedido,
  negocioId,
  onClose,
}: {
  pedido: NegocioPedido
  negocioId: string
  onClose: () => void
}) {
  const [items, setItems] = useState<{ nombre_producto: string; precio_mayorista: number; cantidad: number }[]>([])
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState(0)
  const [cantidad, setCantidad] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function addItem() {
    if (!nombre.trim()) return
    setItems((prev) => [...prev, { nombre_producto: nombre.trim(), precio_mayorista: precio, cantidad }])
    setNombre(''); setPrecio(0); setCantidad(1)
  }

  function handleSubmit() {
    setError(null)
    if (!items.length) { setError('Agregá al menos un producto'); return }
    startTransition(async () => {
      const res = await addItemsToPedido(pedido.id, negocioId, items)
      if (res?.error) { setError(res.error); return }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold">+ Agregar productos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Pedido del {formatFecha(pedido.fecha)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nombre del producto"
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
              />
            </div>
            <div className="col-span-5">
              <input
                type="number" min="0"
                value={precio || ''}
                onChange={(e) => setPrecio(Number(e.target.value))}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Precio mayorista"
              />
            </div>
            <div className="col-span-4">
              <input
                type="number" min="1"
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Cantidad"
              />
            </div>
            <div className="col-span-3 flex">
              <button
                onClick={addItem}
                disabled={!nombre.trim()}
                className="w-full py-2 rounded-lg bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-40 flex items-center justify-center gap-1 text-sm"
              >
                <Plus size={13} /> Agregar
              </button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-2.5 bg-secondary/30 rounded-lg text-sm">
                  <span className="font-medium min-w-0 truncate">{item.nombre_producto}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground text-xs">{formatARS(item.precio_mayorista)} × {item.cantidad}</span>
                    <span className="font-semibold">{formatARS(item.precio_mayorista * item.cantidad)}</span>
                    <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="p-1 rounded hover:bg-secondary">
                      <Trash2 size={11} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || items.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Fila de pedido ─────────────────────────────────────────────────────────

function PedidoCard({ pedido, negocioId }: { pedido: NegocioPedido; negocioId: string }) {
  const [expanded, setExpanded] = useState(!pedido.entregado_at)
  const [showEgreso, setShowEgreso] = useState(false)
  const [showAgregar, setShowAgregar] = useState(false)
  const [isPending, startTransition] = useTransition()
  const total = pedidoTotal(pedido)
  const entregado = !!pedido.entregado_at

  function handleDelete() {
    if (!confirm('¿Eliminar este pedido?')) return
    startTransition(async () => { await deleteNegocioPedido(pedido.id, negocioId) })
  }

  function handleDeleteItem(itemId: string) {
    if (!confirm('¿Eliminar este producto?')) return
    startTransition(async () => { await deleteNegocioItem(itemId, negocioId) })
  }

  return (
    <>
      {showEgreso && <EgresoModal pedido={pedido} negocioId={negocioId} onClose={() => setShowEgreso(false)} />}
      {showAgregar && <AgregarItemsModal pedido={pedido} negocioId={negocioId} onClose={() => setShowAgregar(false)} />}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header del pedido */}
        <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80">
            <span className="text-sm font-semibold">{formatFecha(pedido.fecha)}</span>
            {entregado ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                <Check size={10} /> Entregado {formatFecha(pedido.entregado_at!.split('T')[0])}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                Pendiente
              </span>
            )}
            {pedido.nota && <span className="text-xs text-muted-foreground italic truncate max-w-[160px]">{pedido.nota}</span>}
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold text-sm">{formatARS(total)}</span>

            {!entregado && (
              <button
                onClick={() => setShowEgreso(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                <Check size={11} /> Cargar egreso
              </button>
            )}

            <button
              onClick={() => setShowAgregar(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              <Plus size={11} /> Productos
            </button>

            <button
              onClick={handleDelete}
              disabled={isPending}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>

            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Items */}
        {expanded && (
          <div className="border-t border-border px-4 pb-3 pt-3">
            {pedido.negocio_items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Sin productos — usá "+ Productos" para agregar.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left pb-2 font-medium">Producto</th>
                    <th className="text-right pb-2 font-medium">Precio may.</th>
                    <th className="text-right pb-2 font-medium">Cant.</th>
                    <th className="text-right pb-2 font-medium">Subtotal</th>
                    <th className="w-6" />
                  </tr>
                </thead>
                <tbody>
                  {pedido.negocio_items.map((item) => (
                    <tr key={item.id} className="border-t border-border/50">
                      <td className="py-1.5 font-medium">{item.nombre_producto}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{formatARS(item.precio_mayorista)}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{item.cantidad}</td>
                      <td className="py-1.5 text-right font-semibold">{formatARS(Number(item.precio_mayorista) * item.cantidad)}</td>
                      <td className="py-1.5 pl-2">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={isPending}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-2 text-xs text-muted-foreground text-right">Total</td>
                    <td className="pt-2 text-right font-bold">{formatARS(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Vista principal ────────────────────────────────────────────────────────

export default function NegocioDetalleView({ negocio }: { negocio: Negocio }) {
  const pendientes = negocio.negocio_pedidos.filter((p) => !p.entregado_at)
  const entregados = negocio.negocio_pedidos.filter((p) => p.entregado_at)

  if (negocio.negocio_pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
        <p className="font-medium">Sin pedidos todavía</p>
        <p className="text-sm text-muted-foreground mt-1">Usá "+ Nuevo pedido" para cargar el primero</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {pendientes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            🟡 Pendientes de entrega ({pendientes.length})
          </h2>
          {pendientes.map((p) => (
            <PedidoCard key={p.id} pedido={p} negocioId={negocio.id} />
          ))}
        </section>
      )}

      {entregados.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            ✅ Entregados ({entregados.length})
          </h2>
          {entregados.map((p) => (
            <PedidoCard key={p.id} pedido={p} negocioId={negocio.id} />
          ))}
        </section>
      )}
    </div>
  )
}
