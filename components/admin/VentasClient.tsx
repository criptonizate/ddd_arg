'use client'

import { useState, useTransition, useMemo } from 'react'
import { formatARS, formatDateTime, ESTADO_LABELS, ESTADO_COLORS, ORIGEN_LABELS, METODO_PAGO_LABELS } from '@/lib/utils'
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import OrderActions from '@/components/admin/OrderActions'
import OrderSenaInput from '@/components/admin/OrderSenaInput'
import CopyButton from '@/components/admin/CopyButton'
import { updateOrderSena } from '@/lib/actions/orders'
import OrderNotaInternaInput from './OrderNotaInternaInput'
import EditOrderItemsButton from './EditOrderItemsButton'
import type { OrderEstado } from '@/lib/supabase/types'

interface Order {
  id: string
  estado: OrderEstado
  origen: string
  metodo_pago?: string
  created_at: string
  cliente_nombre: string
  cliente_telefono?: string
  entrega: string
  direccion_envio?: string
  nota?: string
  total: number
  sena?: number
  nota_interna?: string | null
  order_items?: {
    id: string
    products?: { nombre: string }
    nombre_producto: string
    product_variants?: { nombre_variante: string; stock: number }
    nombre_variante?: string
    cantidad: number
    precio_unitario: number
  }[]
}

type Tab = 'listas' | 'entregadas' | 'local'

export default function VentasClient({
  listas,
  entregadas,
  local,
}: {
  listas: Order[]
  entregadas: Order[]
  local: Order[]
}) {
  const [tab, setTab] = useState<Tab>('listas')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Entregadas: primero las que tienen saldo pendiente — memoizado
  const sortedEntregadas = useMemo(() =>
    [...entregadas].sort((a, b) => {
      const pendA = a.total - (a.sena ?? 0)
      const pendB = b.total - (b.sena ?? 0)
      if (pendA > 0 && pendB <= 0) return -1
      if (pendA <= 0 && pendB > 0) return 1
      return 0
    }),
    [entregadas]
  )

  // Total deuda pendiente en entregadas
  const totalDeuda = useMemo(
    () => entregadas.reduce((sum, o) => sum + Math.max(0, o.total - (o.sena ?? 0)), 0),
    [entregadas]
  )

  const baseOrders = tab === 'listas' ? listas : tab === 'entregadas' ? sortedEntregadas : local

  // Filtro de búsqueda
  const orders = useMemo(() => {
    if (!search.trim()) return baseOrders
    const q = search.toLowerCase()
    return baseOrders.filter(
      (o) =>
        o.cliente_nombre.toLowerCase().includes(q) ||
        o.cliente_telefono?.toLowerCase().includes(q) ||
        o.nota?.toLowerCase().includes(q)
    )
  }, [baseOrders, search])

  const total = useMemo(() => orders.reduce((sum, o) => sum + Number(o.total), 0), [orders])

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab('listas')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'listas'
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          📦 Listas
          {listas.length > 0 && (
            <span className={`ml-2 text-xs font-bold ${tab === 'listas' ? 'opacity-70' : 'text-muted-foreground'}`}>
              {listas.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('entregadas')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'entregadas'
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          ✅ Entregadas
          {entregadas.length > 0 && (
            <span className={`ml-2 text-xs font-bold ${tab === 'entregadas' ? 'opacity-70' : 'text-muted-foreground'}`}>
              {entregadas.length}
            </span>
          )}
          {totalDeuda > 0 && tab !== 'entregadas' && (
            <span className="ml-1.5 text-xs font-semibold text-orange-600">· Deben {formatARS(totalDeuda)}</span>
          )}
        </button>
        <button
          onClick={() => setTab('local')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            tab === 'local'
              ? 'bg-foreground text-primary-foreground border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
          }`}
        >
          🏪 Local
          {local.length > 0 && (
            <span className={`ml-2 text-xs font-bold ${tab === 'local' ? 'opacity-70' : 'text-muted-foreground'}`}>
              {local.length}
            </span>
          )}
        </button>
        <div className="ml-auto flex items-center gap-3">
          {total > 0 && (
            <span className="text-sm font-semibold text-muted-foreground">{formatARS(total)}</span>
          )}
          {/* Búsqueda */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="pl-7 pr-7 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring w-40"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de órdenes */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
          <p className="font-medium">{search ? 'Sin resultados' : 'Sin órdenes'}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search
              ? `No se encontró "${search}" — probá con otro término`
              : tab === 'listas' ? 'No hay ventas listas para entregar'
              : tab === 'entregadas' ? 'No hay ventas entregadas'
              : 'No hay ventas registradas en el local'}
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="mt-3 text-xs text-muted-foreground hover:text-foreground underline">
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) =>
            tab === 'listas' ? (
              <FullCard key={order.id} order={order} />
            ) : (
              <CollapsibleCard
                key={order.id}
                order={order}
                expanded={expandedIds.has(order.id)}
                onToggle={() => toggleExpanded(order.id)}
              />
            )
          )}
          {tab === 'local' && orders.length > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              {orders.length} venta{orders.length !== 1 ? 's' : ''} en el local · {formatARS(total)} total
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function FullCard({ order }: { order: Order }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ESTADO_COLORS[order.estado]}`}>
            {ESTADO_LABELS[order.estado]}
          </span>
          <span className="text-xs text-muted-foreground">{ORIGEN_LABELS[order.origen] ?? order.origen}</span>
          {order.metodo_pago && (
            <span className="text-xs text-muted-foreground">{METODO_PAGO_LABELS[order.metodo_pago] ?? order.metodo_pago}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(order.created_at)}</span>
      </div>

      {/* Cliente */}
      <div className="flex items-start gap-6 flex-wrap">
        <div>
          <span className="text-xs text-muted-foreground block">Cliente</span>
          <span className="font-semibold text-sm">{order.cliente_nombre}</span>
        </div>
        {order.cliente_telefono && (
          <div>
            <span className="text-xs text-muted-foreground block">Teléfono</span>
            <div className="flex items-center gap-1">
              <a href={`tel:${order.cliente_telefono}`} className="text-sm font-medium hover:underline">
                {order.cliente_telefono}
              </a>
              <CopyButton text={order.cliente_telefono} />
            </div>
          </div>
        )}
        {order.entrega === 'envio' && order.direccion_envio && (
          <div>
            <span className="text-xs text-muted-foreground block">Dirección</span>
            <span className="text-sm">📦 {order.direccion_envio}</span>
          </div>
        )}
      </div>

      {/* Productos */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📦 Productos</span>
          <EditOrderItemsButton
            orderId={order.id}
            items={(order.order_items ?? []).map((i) => ({
              nombre_producto: i.products?.nombre ?? i.nombre_producto,
              nombre_variante: i.product_variants?.nombre_variante ?? i.nombre_variante ?? null,
              cantidad: i.cantidad,
              precio_unitario: i.precio_unitario,
            }))}
          />
        </div>
        <div className="space-y-1.5">
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{item.products?.nombre ?? item.nombre_producto}</span>
                {(item.product_variants?.nombre_variante || item.nombre_variante) && (
                  <span className="text-muted-foreground"> — {item.product_variants?.nombre_variante ?? item.nombre_variante}</span>
                )}
                <span className="text-muted-foreground"> × {item.cantidad}</span>
              </div>
              <span className="text-sm font-semibold shrink-0">{formatARS(item.precio_unitario * item.cantidad)}</span>
            </div>
          ))}
        </div>
      </div>

      {order.nota && <p className="text-xs text-muted-foreground italic">📝 {order.nota}</p>}

      {/* Total + Seña + Acciones */}
      <div className="border-t border-border pt-3 flex items-end justify-between gap-3 flex-wrap">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Total:</span>
            <span className="text-base font-bold">{formatARS(order.total)}</span>
          </div>
          <OrderSenaInput orderId={order.id} sena={order.sena ?? 0} total={order.total} />
          <OrderNotaInternaInput orderId={order.id} notaInterna={order.nota_interna ?? null} />
        </div>
        <OrderActions orderId={order.id} estado={order.estado} />
      </div>
    </div>
  )
}

function CollapsibleCard({
  order,
  expanded,
  onToggle,
}: {
  order: Order
  expanded: boolean
  onToggle: () => void
}) {
  const pendiente = order.total - (order.sena ?? 0)
  const pagado = (order.sena ?? 0) >= order.total && order.total > 0
  const tienePendiente = !pagado && pendiente > 0

  const [showCobrar, setShowCobrar] = useState(false)
  const [valorCobro, setValorCobro] = useState(pendiente)
  const [isPending, startTransition] = useTransition()

  function abrirCobrar(e: React.MouseEvent) {
    e.stopPropagation()
    setValorCobro(pendiente)
    setShowCobrar(true)
  }

  function confirmarCobro(e: React.MouseEvent) {
    e.stopPropagation()
    const nuevoSena = Math.min(order.total, (order.sena ?? 0) + valorCobro)
    startTransition(async () => {
      await updateOrderSena(order.id, nuevoSena)
      setShowCobrar(false)
    })
  }

  function cancelarCobro(e: React.MouseEvent) {
    e.stopPropagation()
    setShowCobrar(false)
  }

  return (
    <div className={`bg-card rounded-xl shadow-sm overflow-hidden border-l-4 ${tienePendiente ? 'border-l-orange-500 border-t border-r border-b border-orange-500/40' : 'border-l-transparent border border-border'}`}>
      {/* Cabecera siempre visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${ESTADO_COLORS[order.estado]}`}>
            {ESTADO_LABELS[order.estado]}
          </span>
          <span className="font-semibold text-sm truncate">{order.cliente_nombre}</span>
          {pagado && (
            <span className="text-xs font-medium text-green-600 shrink-0">✓ Pagado</span>
          )}
          {tienePendiente && !showCobrar && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300 shrink-0 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800">
              Debe {formatARS(pendiente)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Cobrar inline */}
          {tienePendiente && !showCobrar && (
            <button
              onClick={abrirCobrar}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              💰 Cobrar
            </button>
          )}
          {tienePendiente && showCobrar && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max={pendiente}
                value={valorCobro || ''}
                onChange={(e) => setValorCobro(Number(e.target.value))}
                className="w-24 text-xs border border-orange-400 rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-orange-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmarCobro(e as any)
                  if (e.key === 'Escape') cancelarCobro(e as any)
                }}
              />
              <button
                onClick={confirmarCobro}
                disabled={isPending || valorCobro <= 0}
                className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-2 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                {isPending ? '...' : 'OK'}
              </button>
              <button
                onClick={cancelarCobro}
                className="text-xs text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="font-bold text-sm">{formatARS(order.total)}</span>
          <span className="text-xs text-muted-foreground hidden sm:block">{formatDateTime(order.created_at)}</span>
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>

      {/* Detalle expandible */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* Productos */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Productos</span>
              <EditOrderItemsButton
                orderId={order.id}
                items={(order.order_items ?? []).map((i) => ({
                  nombre_producto: i.products?.nombre ?? i.nombre_producto,
                  nombre_variante: i.product_variants?.nombre_variante ?? i.nombre_variante ?? null,
                  cantidad: i.cantidad,
                  precio_unitario: i.precio_unitario,
                }))}
              />
            </div>
            {order.order_items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{item.products?.nombre ?? item.nombre_producto}</span>
                  {(item.product_variants?.nombre_variante || item.nombre_variante) && (
                    <span className="text-muted-foreground"> — {item.product_variants?.nombre_variante ?? item.nombre_variante}</span>
                  )}
                  <span className="text-muted-foreground"> × {item.cantidad}</span>
                </div>
                <span className="text-sm font-semibold shrink-0">{formatARS(item.precio_unitario * item.cantidad)}</span>
              </div>
            ))}
          </div>

          {order.nota && <p className="text-xs text-muted-foreground italic">📝 {order.nota}</p>}

          {/* Total + Seña + teléfono */}
          <div className="border-t border-border pt-3 flex items-end justify-between gap-3 flex-wrap">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Total:</span>
                <span className="text-base font-bold">{formatARS(order.total)}</span>
              </div>
              <OrderSenaInput orderId={order.id} sena={order.sena ?? 0} total={order.total} />
              <OrderNotaInternaInput orderId={order.id} notaInterna={order.nota_interna ?? null} />
            </div>
            {order.cliente_telefono && (
              <div className="flex items-center gap-1">
                <a href={`tel:${order.cliente_telefono}`} className="text-sm font-medium hover:underline text-muted-foreground">
                  {order.cliente_telefono}
                </a>
                <CopyButton text={order.cliente_telefono} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
